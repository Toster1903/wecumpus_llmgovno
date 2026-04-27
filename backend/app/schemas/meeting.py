from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=300)
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
