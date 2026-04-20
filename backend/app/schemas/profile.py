from pydantic import BaseModel
from typing import List, Optional

class ProfileCreate(BaseModel):
    full_name: str
    age: int
    bio: str
    interests: List[str]

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None

class ProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    age: int
    bio: str
    interests: List[str]
    is_looking: bool

    class Config:
        from_attributes = True