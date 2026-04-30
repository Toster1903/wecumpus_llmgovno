from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.event import EventCreate, EventOut
from app.services import event_service

router = APIRouter()


@router.get("/", response_model=list[EventOut])
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return event_service.list_events(db, current_user.id)


@router.get("/my-registrations", response_model=list[EventOut])
def my_registrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return event_service.get_registered_events(db, current_user.id)


@router.post("/", response_model=EventOut)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return event_service.create_event(db, current_user.id, payload)


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = event_service.get_event(db, event_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("/{event_id}/register", response_model=EventOut)
def register_for_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = event_service.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event_service.register_for_event(db, event_id, current_user.id)
    return event_service.get_event(db, event_id, current_user.id)


@router.delete("/{event_id}/register")
def unregister_from_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event_service.unregister_from_event(db, event_id, current_user.id)
    return {"status": "unregistered"}


@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        deleted = event_service.delete_event(db, event_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"status": "deleted"}
