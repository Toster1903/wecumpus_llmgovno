from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class RideCreate(BaseModel):
    from_location: str
    to_location: str
    departure_time: datetime
    seats_total: int = 1
    comment: Optional[str] = None


class RideOut(BaseModel):
    id: int
    driver_id: int
    driver_name: Optional[str] = None
    from_location: str
    to_location: str
    departure_time: datetime
    seats_total: int
    seats_taken: int
    comment: Optional[str] = None
    is_joined: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
