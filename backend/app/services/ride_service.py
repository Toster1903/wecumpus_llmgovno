from sqlalchemy.orm import Session
from app.models.ride import Ride, RidePassenger
from app.models.profile import Profile
from app.schemas.ride import RideCreate


def _enrich(ride: Ride, db: Session, viewer_id: int | None = None) -> dict:
    profile = db.query(Profile).filter(Profile.user_id == ride.driver_id).first()
    seats_taken = len(ride.passengers)
    is_joined = any(p.user_id == viewer_id for p in ride.passengers) if viewer_id else False
    return {
        "id": ride.id,
        "driver_id": ride.driver_id,
        "driver_name": profile.full_name if profile else None,
        "from_location": ride.from_location,
        "to_location": ride.to_location,
        "departure_time": ride.departure_time,
        "seats_total": ride.seats_total,
        "seats_taken": seats_taken,
        "comment": ride.comment,
        "is_joined": is_joined,
        "created_at": ride.created_at,
    }


def list_rides(db: Session, viewer_id: int) -> list[dict]:
    rides = db.query(Ride).order_by(Ride.departure_time.asc()).all()
    return [_enrich(r, db, viewer_id) for r in rides]


def create_ride(db: Session, driver_id: int, data: RideCreate) -> dict:
    ride = Ride(
        driver_id=driver_id,
        from_location=data.from_location,
        to_location=data.to_location,
        departure_time=data.departure_time,
        seats_total=data.seats_total,
        comment=data.comment,
    )
    db.add(ride)
    db.commit()
    db.refresh(ride)
    return _enrich(ride, db, driver_id)


def join_ride(db: Session, ride_id: int, user_id: int) -> dict:
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise ValueError("Ride not found")
    if ride.driver_id == user_id:
        raise ValueError("You are the driver of this ride")
    already = db.query(RidePassenger).filter(
        RidePassenger.ride_id == ride_id, RidePassenger.user_id == user_id
    ).first()
    if already:
        raise ValueError("Already joined")
    if len(ride.passengers) >= ride.seats_total:
        raise ValueError("No seats available")
    passenger = RidePassenger(ride_id=ride_id, user_id=user_id)
    db.add(passenger)
    db.commit()
    db.refresh(ride)
    return _enrich(ride, db, user_id)


def leave_ride(db: Session, ride_id: int, user_id: int) -> dict:
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise ValueError("Ride not found")
    passenger = db.query(RidePassenger).filter(
        RidePassenger.ride_id == ride_id, RidePassenger.user_id == user_id
    ).first()
    if not passenger:
        raise ValueError("You are not in this ride")
    db.delete(passenger)
    db.commit()
    db.refresh(ride)
    return _enrich(ride, db, user_id)


def delete_ride(db: Session, ride_id: int, user_id: int) -> bool:
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        return False
    if ride.driver_id != user_id:
        raise PermissionError("Only the driver can cancel this ride")
    db.delete(ride)
    db.commit()
    return True
