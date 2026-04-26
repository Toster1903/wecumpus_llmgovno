from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PostCreate(BaseModel):
    title: str
    content: str
    tags: Optional[list[str]] = []


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
