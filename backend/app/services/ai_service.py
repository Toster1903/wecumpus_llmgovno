"""
AI service backed by a local Ollama instance.

Setup:
  1. Install Ollama: https://ollama.com/download
  2. Pull a model: `ollama pull qwen2.5:3b`
  3. Run server (starts automatically after install): `ollama serve`
  4. Optionally set OLLAMA_URL env var (default: http://localhost:11434)

If Ollama is not available, all calls fall back gracefully.
"""

import os
import logging
import urllib.request
import urllib.error
import json

logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

CAMPUS_SYSTEM_PROMPT = (
    "Ты AI-ассистент кампуса Университета Сириус (г. Сочи, ул. Шкиперская 11). "
    "Помогаешь студентам и сотрудникам: находить соседей по интересам, узнавать о событиях, "
    "организовывать попутки, находить что-то на маркетплейсе, общаться в клубах. "
    "Отвечай на русском языке. Будь кратким, дружелюбным и конкретным. "
    "Если не знаешь точного ответа — предложи варианты или спроси уточнение."
)


def _post_json(url: str, payload: dict, timeout: int = 30) -> dict | None:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
        logger.warning("Ollama request failed: %s, %s", exc, req.full_url)

        return None


def chat(message: str, history: list[dict] | None = None) -> str:
    """Send a chat message, return the assistant reply."""
    messages = [{"role": "system", "content": CAMPUS_SYSTEM_PROMPT}]
    for item in (history or []):
        role = item.get("role", "user")
        content = item.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    result = _post_json(
        f"{OLLAMA_URL}/api/chat",
        {"model": OLLAMA_MODEL, "messages": messages, "stream": False},
        timeout=60,
    )
    if result:
        return result.get("message", {}).get("content", "").strip()
    return "AI-ассистент временно недоступен. Убедитесь, что Ollama запущена (`ollama serve`)."


def explain_match(my_profile: dict, candidate: dict) -> str:
    """Return a short human-readable explanation of why two people are compatible."""
    my_interests = ", ".join(my_profile.get("interests") or []) or "не указаны"
    cand_interests = ", ".join(candidate.get("interests") or []) or "не указаны"
    my_bio = my_profile.get("bio") or ""
    cand_bio = candidate.get("bio") or ""

    prompt = (
        f"Объясни в 1–2 предложениях, почему эти два студента могут стать хорошими соседями или друзьями.\n"
        f"Студент А: интересы — {my_interests}. О себе: {my_bio}\n"
        f"Студент Б: интересы — {cand_interests}. О себе: {cand_bio}\n"
        f"Дай конкретный, живой ответ. Не повторяй имена, говори «вы»."
    )
    result = _post_json(
        f"{OLLAMA_URL}/api/generate",
        {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=30,
    )
    if result:
        return result.get("response", "").strip()
    my_common = set(my_profile.get("interests") or []) & set(candidate.get("interests") or [])
    if my_common:
        return f"Общие интересы: {', '.join(list(my_common)[:3])}."
    return "Похожий стиль анкеты и бытовые привычки."


def suggest_feed_items(user_interests: list[str], items: list[dict]) -> list[dict]:
    """
    Re-rank a list of feed items (events/posts/rides) for the given user.
    Returns the same list with an added 'ai_reason' field, sorted by relevance.
    Each item must have at least: 'type', 'title', 'tags' (list).
    Falls back to original order if Ollama is unavailable.
    """
    if not items:
        return items

    interests_str = ", ".join(user_interests) if user_interests else "не указаны"
    items_text = "\n".join(
        f"{i+1}. [{it.get('type','?')}] {it.get('title','?')} теги: {', '.join(it.get('tags') or [])}"
        for i, it in enumerate(items)
    )
    prompt = (
        f"Пользователь интересуется: {interests_str}.\n"
        f"Ниже список материалов (события, посты, попутки):\n{items_text}\n\n"
        f"Выведи JSON-массив с полями 'index' (1-based) и 'reason' (1 предложение, почему интересно). "
        f"Отсортируй по релевантности. Формат: [{{'index':1,'reason':'...'}},...]. Только JSON, без пояснений."
    )
    result = _post_json(
        f"{OLLAMA_URL}/api/generate",
        {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=45,
    )
    if not result:
        return items

    raw = result.get("response", "")
    try:
        start = raw.index("[")
        end = raw.rindex("]") + 1
        ranked = json.loads(raw[start:end])
        ordered = []
        seen = set()
        for entry in ranked:
            idx = int(entry.get("index", 0)) - 1
            reason = entry.get("reason", "")
            if 0 <= idx < len(items) and idx not in seen:
                seen.add(idx)
                ordered.append({**items[idx], "ai_reason": reason})
        for i, it in enumerate(items):
            if i not in seen:
                ordered.append(it)
        return ordered
    except (ValueError, KeyError, json.JSONDecodeError):
        return items


def chat_with_tools(
    message: str,
    history: list[dict] | None,
    db,  # SQLAlchemy Session
    user_id: int,
) -> str:
    """
    Chat with Ollama using native tool use.
    Makes up to 2 requests: first with tools, second with tool results if needed.
    Falls back to plain chat() if tool use is unavailable.
    """
    from app.services.ai_tools import TOOL_SCHEMAS, TOOL_EXECUTORS
    import json as _json

    messages = [{"role": "system", "content": CAMPUS_SYSTEM_PROMPT}]
    for item in (history or []):
        role = item.get("role", "user")
        content = item.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    result = _post_json(
        f"{OLLAMA_URL}/api/chat",
        {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "tools": TOOL_SCHEMAS,
            "stream": False,
        },
        timeout=60,
    )
    if not result:
        return "AI-ассистент временно недоступен. Убедитесь, что Ollama запущена (`ollama serve`)."

    response_message = result.get("message", {})
    tool_calls = response_message.get("tool_calls") or []

    if not tool_calls:
        return response_message.get("content", "").strip()

    # Execute each tool call
    messages.append(response_message)
    for call in tool_calls:
        fn_name = call.get("function", {}).get("name", "")
        raw_args = call.get("function", {}).get("arguments", {})
        if isinstance(raw_args, str):
            try:
                raw_args = _json.loads(raw_args)
            except _json.JSONDecodeError:
                raw_args = {}

        executor = TOOL_EXECUTORS.get(fn_name)
        if executor:
            try:
                tool_result = executor(db=db, user_id=user_id, **raw_args)
            except Exception as exc:
                logger.warning("Tool %s failed: %s", fn_name, exc)
                tool_result = []
        else:
            tool_result = []

        messages.append({
            "role": "tool",
            "content": _json.dumps(tool_result, ensure_ascii=False),
        })

    # Second request with tool results
    result2 = _post_json(
        f"{OLLAMA_URL}/api/chat",
        {"model": OLLAMA_MODEL, "messages": messages, "stream": False},
        timeout=60,
    )
    if result2:
        return result2.get("message", {}).get("content", "").strip()
    return "Не удалось получить ответ от AI-ассистента."
