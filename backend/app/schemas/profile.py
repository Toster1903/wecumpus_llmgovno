from pydantic import BaseModel
from typing import List, Optional


class RoommateHabits(BaseModel):
    bedtime: Optional[str] = None
    wake_time: Optional[str] = None
    cleanliness: Optional[str] = None
    guests: Optional[str] = None
    noise: Optional[str] = None
    smoking: Optional[str] = None
    pets: Optional[str] = None
    roommate_expectations: Optional[str] = None


class ProfilePrivatePreferencesOut(BaseModel):
    private_habits: Optional[RoommateHabits] = None

class ProfileCreate(BaseModel):
    full_name: str
    age: int
    bio: str
    interests: List[str]
    avatar_url: Optional[str] = None
    private_habits: Optional[RoommateHabits] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None
    avatar_url: Optional[str] = None
    private_habits: Optional[RoommateHabits] = None

class ProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    age: int
    bio: str
    interests: List[str]
    avatar_url: Optional[str] = None
    is_looking: bool

    class Config:
        from_attributes = True


class ProfileAnalysisStatus(BaseModel):
    status: str
    message: str