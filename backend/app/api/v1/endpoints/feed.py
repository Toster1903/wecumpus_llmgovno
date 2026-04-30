"""
Aggregated activity feed: events + rides + posts + mutual matches.
Optionally AI-ranked by user interests.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.event import Event
from app.models.match import Match
from app.models.post import Post
from app.models.profile import Profile
from app.models.ride import Ride
from app.models.user import User
from app.services import ai_service

router = APIRouter()


def _build_profile_map(db: Session, user_ids: list[int]) -> dict[int, str]:
    if not user_ids:
        return {}
    profiles = db.query(Profile.user_id, Profile.full_name).filter(Profile.user_id.in_(user_ids)).all()
    result = {p.user_id: p.full_name for p in profiles}
    for uid in user_ids:
        result.setdefault(uid, f"Пользователь #{uid}")
    return result


@router.get("/")
def get_feed(
    limit: int = Query(30, le=100),
    ai_rank: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    my_interests = my_profile.interests if my_profile else []

    # Fetch all content in bulk
    events = db.query(Event).order_by(Event.created_at.desc()).limit(20).all()
    rides = db.query(Ride).order_by(Ride.created_at.desc()).limit(15).all()
    posts = db.query(Post).order_by(Post.created_at.desc()).limit(20).all()

    user_likes = db.query(Match).filter(
        Match.user_id == current_user.id,
        Match.action == "like",
    ).all()
    liked_ids = [m.matched_user_id for m in user_likes]
    mutual = []
    if liked_ids:
        mutual = db.query(Match).filter(
            Match.user_id.in_(liked_ids),
            Match.matched_user_id == current_user.id,
            Match.action == "like",
        ).order_by(Match.created_at.desc()).limit(5).all()

    # Resolve all profile names in a single query
    all_user_ids = (
        [e.creator_id for e in events]
        + [r.driver_id for r in rides]
        + [p.author_id for p in posts]
        + [m.user_id for m in mutual]
    )
    names = _build_profile_map(db, list(set(all_user_ids)))

    items = []

    for e in events:
        items.append({
            "type": "event",
            "id": f"event-{e.id}",
            "title": e.title,
            "body": e.description or "",
            "location": e.location or "",
            "tags": e.tags or [],
            "who": names.get(e.creator_id, ""),
            "time": e.created_at.isoformat() if e.created_at else None,
            "tone": "butter",
        })

    for r in rides:
        seats_left = r.seats_total - len(r.passengers)
        if seats_left <= 0:
            continue
        items.append({
            "type": "ride",
            "id": f"ride-{r.id}",
            "title": f"{r.from_location} → {r.to_location}",
            "body": r.comment or "",
            "tags": [],
            "who": names.get(r.driver_id, ""),
            "time": r.created_at.isoformat() if r.created_at else None,
            "tone": "sky",
            "seats_left": seats_left,
        })

    for p in posts:
        items.append({
            "type": "post",
            "id": f"post-{p.id}",
            "title": p.title,
            "body": p.content[:200],
            "tags": p.tags or [],
            "who": names.get(p.author_id, ""),
            "time": p.created_at.isoformat() if p.created_at else None,
            "tone": "sage",
        })

    for m in mutual:
        items.append({
            "type": "match",
            "id": f"match-{m.id}",
            "title": "Новый взаимный мэтч",
            "body": "",
            "tags": [],
            "who": names.get(m.user_id, ""),
            "time": m.created_at.isoformat() if m.created_at else None,
            "tone": "rose",
        })

    # Sort by recency
    items.sort(key=lambda x: x.get("time") or "", reverse=True)
    items = items[:limit]

    if ai_rank and my_interests:
        items = ai_service.suggest_feed_items(my_interests, items)

    return items
