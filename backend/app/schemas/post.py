from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=10000)
    tags: Optional[list[str]] = Field(default_factory=list)


class PostOut(BaseModel):
    id: int
    author_id: int
    author_name: Optional[str] = None
    author_avatar_url: Optional[str] = None
    title: str
    content: str
    tags: Optional[list[str]] = []
    created_at: datetime

    class Config:
        from_attributes = True
