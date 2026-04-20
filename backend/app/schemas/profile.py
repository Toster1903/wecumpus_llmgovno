from pydantic import BaseModel
from typing import List, Optional

class ProfileCreate(BaseModel):
    full_name: str
    age: int
    bio: str
    interests: List[str]

class ProfileOut(BaseModel):
    id: int
    full_name: str
    bio: str
    interests: List[str]
    is_looking: bool

    class Config:
        from_attributes = True