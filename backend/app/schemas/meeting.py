from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    scheduled_at: datetime


class MeetingOut(BaseModel):
    id: int
    creator_id: int
    creator_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    scheduled_at: datetime
    participant_count: int = 0
    is_joined: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
