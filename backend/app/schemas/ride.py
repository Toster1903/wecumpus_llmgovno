from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RideCreate(BaseModel):
    from_location: str = Field(..., min_length=1, max_length=300)
    to_location: str = Field(..., min_length=1, max_length=300)
    departure_time: datetime
    seats_total: int = Field(1, ge=1, le=20)
    comment: Optional[str] = Field(None, max_length=500)


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
