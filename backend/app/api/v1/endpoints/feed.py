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


def _profile_name(db: Session, user_id: int) -> str:
    p = db.query(Profile).filter(Profile.user_id == user_id).first()
    return p.full_name if p else f"Пользователь #{user_id}"


@router.get("/")
def get_feed(
    limit: int = Query(30, le=100),
    ai_rank: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    my_interests = my_profile.interests if my_profile else []

    items = []

    # Events
    events = db.query(Event).order_by(Event.created_at.desc()).limit(20).all()
    for e in events:
        items.append({
            "type": "event",
            "id": f"event-{e.id}",
            "title": e.title,
            "body": e.description or "",
            "location": e.location or "",
            "tags": e.tags or [],
            "who": _profile_name(db, e.creator_id),
            "time": e.created_at.isoformat() if e.created_at else None,
            "tone": "butter",
        })

    # Rides with free seats
    rides = db.query(Ride).order_by(Ride.created_at.desc()).limit(15).all()
    for r in rides:
        seats_taken = len(r.passengers)
        seats_left = r.seats_total - seats_taken
        if seats_left <= 0:
            continue
        items.append({
            "type": "ride",
            "id": f"ride-{r.id}",
            "title": f"{r.from_location} → {r.to_location}",
            "body": r.comment or "",
            "tags": [],
            "who": _profile_name(db, r.driver_id),
            "time": r.created_at.isoformat() if r.created_at else None,
            "tone": "sky",
            "seats_left": seats_left,
        })

    # Posts
    posts = db.query(Post).order_by(Post.created_at.desc()).limit(20).all()
    for p in posts:
        items.append({
            "type": "post",
            "id": f"post-{p.id}",
            "title": p.title,
            "body": p.content[:200],
            "tags": p.tags or [],
            "who": _profile_name(db, p.author_id),
            "time": p.created_at.isoformat() if p.created_at else None,
            "tone": "sage",
        })

    # Recent mutual matches
    user_likes = db.query(Match).filter(
        Match.user_id == current_user.id,
        Match.action == "like",
    ).all()
    liked_ids = [m.matched_user_id for m in user_likes]

    if liked_ids:
        mutual = db.query(Match).filter(
            Match.user_id.in_(liked_ids),
            Match.matched_user_id == current_user.id,
            Match.action == "like",
        ).order_by(Match.created_at.desc()).limit(5).all()

        for m in mutual:
            items.append({
                "type": "match",
                "id": f"match-{m.id}",
                "title": "Новый взаимный мэтч",
                "body": "",
                "tags": [],
                "who": _profile_name(db, m.user_id),
                "time": m.created_at.isoformat() if m.created_at else None,
                "tone": "rose",
            })

    # Sort by recency
    items.sort(key=lambda x: x.get("time") or "", reverse=True)
    items = items[:limit]

    if ai_rank and my_interests:
        items = ai_service.suggest_feed_items(my_interests, items)

    return items
