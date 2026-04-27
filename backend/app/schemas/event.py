from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=300)
    start_time: datetime
    end_time: Optional[datetime] = None
    tags: Optional[List[str]] = Field(default_factory=list)


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
