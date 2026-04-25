from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.ride import RideCreate, RideOut
from app.services import ride_service

router = APIRouter()


@router.get("/", response_model=list[RideOut])
def list_rides(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ride_service.list_rides(db, current_user.id)


@router.post("/", response_model=RideOut)
def create_ride(
    payload: RideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ride_service.create_ride(db, current_user.id, payload)


@router.post("/{ride_id}/join", response_model=RideOut)
def join_ride(
    ride_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ride_service.join_ride(db, ride_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{ride_id}/leave", response_model=RideOut)
def leave_ride(
    ride_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ride_service.leave_ride(db, ride_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{ride_id}")
def delete_ride(
    ride_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        deleted = ride_service.delete_ride(db, ride_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Ride not found")
    return {"status": "deleted"}
