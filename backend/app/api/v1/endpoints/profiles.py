from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.profile import ProfileCreate, ProfileOut
from app.services import profile_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=ProfileOut)
def create_my_profile(
    profile_in: ProfileCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return profile_service.create_profile(db, profile_in, current_user.id)

@router.get("/match", response_model=List[ProfileOut])
def match_neighbors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return profile_service.get_matches(db, current_user.id)