# AI Tool Use + Seed Data Design

**Date:** 2026-04-30  
**Project:** Wecampus — Университет Сириус, Сочи

---

## Overview

Добавить нативный tool use (function calling) в LLM-ассистент через Ollama API, чтобы модель могла запрашивать реальные данные из БД. Параллельно — загрузить мок-данные для демонстрации всех аспектов приложения.

---

## Architecture

### Tool Use Flow

```
User message
    ↓
POST /api/v1/ai/chat
    ↓
ai_service.chat_with_tools(message, history, db, user_id)
    ↓
Ollama /api/chat { model, messages, tools: [...], stream: false }
    ↓
  ┌─ response.message.tool_calls? ─── YES → execute tool(s) via DB
  │                                           ↓
  │                                  append tool results to messages
  │                                           ↓
  │                                  second Ollama request → final answer
  └─ NO → return response directly
```

### New Files

- `backend/app/services/ai_tools.py` — tool schemas (Ollama format) + executor functions
- `backend/app/seed_data.py` — mock data script

### Modified Files

- `backend/app/services/ai_service.py` — add `chat_with_tools()`, keep `chat()` as fallback
- `backend/app/api/v1/endpoints/ai.py` — pass `db` and `current_user.id` to new method

---

## Tools (7 total)

| Name | Parameters | DB Query |
|------|-----------|----------|
| `find_users_by_interests` | `interests: list[str]` | Profile WHERE interests && param |
| `find_events_for_user` | `user_id: int` | Event WHERE tags && user.profile.interests |
| `find_users_for_event` | `event_id: int` | Event tags → Profile WHERE interests overlap |
| `search_marketplace` | `query: str`, `category?: str` | MarketItem ILIKE + optional category |
| `find_clubs_by_tags` | `tags: list[str]` | Club WHERE tags && param |
| `get_upcoming_events` | `limit?: int` (default 5) | Event WHERE start_time > now() ORDER BY start_time |
| `find_ride_companions` | `origin: str`, `destination: str` | Ride WHERE origin/destination ILIKE |

Each tool returns a `list[dict]` with human-readable fields. Results are appended as a `tool` role message before the second Ollama call.

---

## Seed Data

Run: `python -m app.seed_data` from `backend/`

### Users & Profiles (20)

Diverse personas: programmers, designers, athletes, musicians, gamers, scientists.
All names, bios, interests in Russian. Each profile has `interests` (3-6 tags), `bio` (1-2 sentences), `age` (18-25), `is_looking=True`.

### Events (15)

Categories: hackathon, concert, sports, film club, lecture, workshop, party, yoga.
Each has `tags`, `location` on campus, realistic future `start_time`.

### Clubs (5)

Examples: Клуб программистов, Музыкальная студия, Спортивный клуб, Книжный клуб, Клуб настольных игр.

### Marketplace (10)

Mix of: учебники, техника, одежда, музыкальные инструменты, спортивный инвентарь.

### Rides (8)

Routes: Сириус ↔ Адлер, Сириус ↔ Сочи центр, Сириус ↔ Краснодар.

### Posts (10)

Variety: объявления, вопросы, истории — от разных пользователей.

---

## Implementation Order

1. `ai_tools.py` — tool definitions + DB executor functions
2. `ai_service.py` — `chat_with_tools()` using new tools
3. `ai.py` endpoint — wire `db` + `user_id` into chat
4. `seed_data.py` — full mock dataset
5. Run seed script and verify end-to-end

---

## Constraints

- Ollama model must support tool use: `qwen2.5:3b` ✓
- Max 1 tool-call round-trip (no recursive loops)
- All tool results truncated to top 5 items to stay within context
- Seed script is idempotent (skips if data already exists)
