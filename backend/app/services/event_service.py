from sqlalchemy.orm import Session
from app.models.event import Event
from app.models.profile import Profile
from app.schemas.event import EventCreate


def _enrich(event: Event, db: Session) -> dict:
    profile = db.query(Profile).filter(Profile.user_id == event.creator_id).first()
    return {
        "id": event.id,
        "creator_id": event.creator_id,
        "creator_name": profile.full_name if profile else None,
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "tags": event.tags or [],
        "created_at": event.created_at,
    }


def list_events(db: Session) -> list[dict]:
    events = db.query(Event).order_by(Event.start_time.asc()).all()
    return [_enrich(e, db) for e in events]


def create_event(db: Session, creator_id: int, data: EventCreate) -> dict:
    event = Event(
        creator_id=creator_id,
        title=data.title,
        description=data.description,
        location=data.location,
        start_time=data.start_time,
        end_time=data.end_time,
        tags=data.tags or [],
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _enrich(event, db)


def get_event(db: Session, event_id: int) -> dict | None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        return None
    return _enrich(event, db)


def delete_event(db: Session, event_id: int, user_id: int) -> bool:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        return False
    if event.creator_id != user_id:
        raise PermissionError("Only the creator can delete this event")
    db.delete(event)
    db.commit()
    return True
