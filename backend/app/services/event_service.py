from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.event import Event
from app.models.event_registration import EventRegistration
from app.models.profile import Profile
from app.schemas.event import EventCreate


def _enrich(event: Event, db: Session, current_user_id: int | None = None) -> dict:
    profile = db.query(Profile).filter(Profile.user_id == event.creator_id).first()
    count = db.query(EventRegistration).filter(EventRegistration.event_id == event.id).count()
    is_registered = False
    if current_user_id:
        is_registered = db.query(EventRegistration).filter(
            EventRegistration.event_id == event.id,
            EventRegistration.user_id == current_user_id,
        ).first() is not None
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
        "is_registered": is_registered,
        "registrations_count": count,
    }


def list_events(db: Session, current_user_id: int | None = None) -> list[dict]:
    events = db.query(Event).order_by(Event.start_time.asc()).all()
    return [_enrich(e, db, current_user_id) for e in events]


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
    return _enrich(event, db, creator_id)


def get_event(db: Session, event_id: int, current_user_id: int | None = None) -> dict | None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        return None
    return _enrich(event, db, current_user_id)


def delete_event(db: Session, event_id: int, user_id: int) -> bool:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        return False
    if event.creator_id != user_id:
        raise PermissionError("Only the creator can delete this event")
    db.delete(event)
    db.commit()
    return True


def register_for_event(db: Session, event_id: int, user_id: int) -> bool:
    """Returns True if newly registered, False if already registered."""
    reg = EventRegistration(event_id=event_id, user_id=user_id)
    db.add(reg)
    try:
        db.commit()
        return True
    except IntegrityError:
        db.rollback()
        return False


def unregister_from_event(db: Session, event_id: int, user_id: int) -> bool:
    reg = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.user_id == user_id,
    ).first()
    if not reg:
        return False
    db.delete(reg)
    db.commit()
    return True


def get_registered_events(db: Session, user_id: int) -> list[dict]:
    regs = db.query(EventRegistration).filter(EventRegistration.user_id == user_id).all()
    return [_enrich(r.event, db, user_id) for r in regs if r.event]
