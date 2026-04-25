from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    tags: Optional[List[str]] = []


class EventOut(BaseModel):
    id: int
    creator_id: int
    creator_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    tags: Optional[List[str]] = []
    created_at: datetime

    class Config:
        from_attributes = True
