# backend/app/services/ai_tools.py
"""
Tool definitions for Ollama function calling + DB executor functions.
Each executor receives (db: Session, **kwargs) and returns list[dict].
"""
from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.profile import Profile
from app.models.event import Event
from app.models.club import Club
from app.models.market_item import MarketItem
from app.models.ride import Ride
from app.models.user import User

# ── Ollama tool schemas ────────────────────────────────────────────────────────

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "find_users_by_interests",
            "description": "Найти студентов/пользователей по интересам. Возвращает список людей.",
            "parameters": {
                "type": "object",
                "properties": {
                    "interests": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Список интересов, например ['python', 'музыка']",
                    }
                },
                "required": ["interests"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_events_for_user",
            "description": "Найти мероприятия подходящие текущему пользователю на основе его интересов.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "integer",
                        "description": "ID текущего пользователя",
                    }
                },
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_users_for_event",
            "description": "Найти пользователей которым может быть интересно конкретное мероприятие.",
            "parameters": {
                "type": "object",
                "properties": {
                    "event_id": {
                        "type": "integer",
                        "description": "ID мероприятия",
                    }
                },
                "required": ["event_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_marketplace",
            "description": "Поиск товаров на маркетплейсе кампуса.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Поисковый запрос, например 'гитара' или 'учебник'",
                    },
                    "category": {
                        "type": "string",
                        "description": "Категория товара (необязательно): electronics, books, clothing, sports, music, other",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_clubs_by_tags",
            "description": "Найти клубы по тегам/интересам.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Теги для поиска клубов, например ['программирование', 'спорт']",
                    }
                },
                "required": ["tags"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_upcoming_events",
            "description": "Получить ближайшие предстоящие мероприятия кампуса.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Максимальное количество событий (по умолчанию 5)",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_ride_companions",
            "description": "Найти попутчиков по маршруту.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {
                        "type": "string",
                        "description": "Откуда, например 'Сириус' или 'Адлер'",
                    },
                    "destination": {
                        "type": "string",
                        "description": "Куда, например 'Сочи' или 'Краснодар'",
                    },
                },
                "required": ["origin", "destination"],
            },
        },
    },
]

# ── Executor functions ─────────────────────────────────────────────────────────

def find_users_by_interests(db: Session, interests: list[str], **_) -> list[dict]:
    profiles = (
        db.query(Profile)
        .filter(Profile.interests.overlap(interests))
        .limit(5)
        .all()
    )
    return [
        {
            "name": p.full_name,
            "age": p.age,
            "interests": p.interests,
            "bio": p.bio,
        }
        for p in profiles
    ]


def find_events_for_user(db: Session, user_id: int, **_) -> list[dict]:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile or not profile.interests:
        return get_upcoming_events(db)
    now = datetime.now(timezone.utc)
    events = (
        db.query(Event)
        .filter(Event.start_time > now)
        .filter(Event.tags.overlap(profile.interests))
        .order_by(Event.start_time)
        .limit(5)
        .all()
    )
    return [_event_dict(e) for e in events]


def find_users_for_event(db: Session, event_id: int, **_) -> list[dict]:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or not event.tags:
        return []
    profiles = (
        db.query(Profile)
        .filter(Profile.interests.overlap(event.tags))
        .limit(5)
        .all()
    )
    return [
        {"name": p.full_name, "interests": p.interests, "bio": p.bio}
        for p in profiles
    ]


def search_marketplace(db: Session, query: str, category: str | None = None, **_) -> list[dict]:
    q = db.query(MarketItem).filter(MarketItem.is_available == True)
    q = q.filter(
        or_(
            MarketItem.title.ilike(f"%{query}%"),
            MarketItem.description.ilike(f"%{query}%"),
        )
    )
    if category:
        q = q.filter(MarketItem.category == category)
    items = q.limit(5).all()
    return [
        {
            "id": i.id,
            "title": i.title,
            "price": float(i.price),
            "category": i.category,
            "condition": i.condition,
            "description": i.description,
        }
        for i in items
    ]


def find_clubs_by_tags(db: Session, tags: list[str], **_) -> list[dict]:
    clubs = (
        db.query(Club)
        .filter(Club.tags.overlap(tags))
        .limit(5)
        .all()
    )
    return [
        {"id": c.id, "name": c.name, "description": c.description, "tags": c.tags}
        for c in clubs
    ]


def get_upcoming_events(db: Session, limit: int = 5, **_) -> list[dict]:
    now = datetime.now(timezone.utc)
    events = (
        db.query(Event)
        .filter(Event.start_time > now)
        .order_by(Event.start_time)
        .limit(limit)
        .all()
    )
    return [_event_dict(e) for e in events]


def find_ride_companions(db: Session, origin: str, destination: str, **_) -> list[dict]:
    now = datetime.now(timezone.utc)
    rides = (
        db.query(Ride)
        .filter(Ride.departure_time > now)
        .filter(Ride.from_location.ilike(f"%{origin}%"))
        .filter(Ride.to_location.ilike(f"%{destination}%"))
        .limit(5)
        .all()
    )
    return [
        {
            "id": r.id,
            "from": r.from_location,
            "to": r.to_location,
            "departure": r.departure_time.isoformat(),
            "seats": r.seats_total,
            "comment": r.comment,
        }
        for r in rides
    ]


# ── Helper ─────────────────────────────────────────────────────────────────────

def _event_dict(e: Event) -> dict:
    return {
        "id": e.id,
        "title": e.title,
        "description": e.description,
        "location": e.location,
        "start_time": e.start_time.isoformat(),
        "tags": e.tags,
    }


# ── Dispatch ──────────────────────────────────────────────────────────────────

TOOL_EXECUTORS: dict[str, callable] = {
    "find_users_by_interests": find_users_by_interests,
    "find_events_for_user": find_events_for_user,
    "find_users_for_event": find_users_for_event,
    "search_marketplace": search_marketplace,
    "find_clubs_by_tags": find_clubs_by_tags,
    "get_upcoming_events": get_upcoming_events,
    "find_ride_companions": find_ride_companions,
}
