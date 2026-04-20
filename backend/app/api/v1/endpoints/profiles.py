from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.profile import (
    ProfileCreate,
    ProfileUpdate,
    ProfileOut,
    ProfileAnalysisStatus,
    ProfilePrivatePreferencesOut,
)
from app.services import profile_service, message_service
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

@router.get("/me", response_model=ProfileOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = profile_service.get_current_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.get("/me/preferences", response_model=ProfilePrivatePreferencesOut)
def get_my_private_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = profile_service.get_current_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"private_habits": profile.private_habits}


@router.get("/user/{user_id}", response_model=ProfileOut)
def get_profile_by_user_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        if not message_service.is_mutual_match(db, current_user.id, user_id):
            raise HTTPException(status_code=403, detail="Profile available only for mutual matches")

    profile = profile_service.get_current_profile(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.get("/me/status", response_model=ProfileAnalysisStatus)
def get_my_profile_analysis_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status = profile_service.get_profile_analysis_status(db, current_user.id)

    if status == "missing":
        return {"status": "missing", "message": "Профиль еще не создан."}
    if status == "processing":
        return {"status": "processing", "message": "AI анализирует вашу анкету..."}
    if status == "failed":
        return {"status": "failed", "message": "Не удалось завершить AI-анализ анкеты."}
    return {"status": "ready", "message": "AI-анализ анкеты завершен."}

@router.patch("/me", response_model=ProfileOut)
def update_my_profile(
    profile_in: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = profile_service.update_profile(db, current_user.id, profile_in)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.get("/match", response_model=List[ProfileOut])
def match_neighbors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    q: str | None = None,
    interest: str | None = None,
    min_age: int | None = None,
    max_age: int | None = None,
):
    return profile_service.get_matches(
        db,
        current_user.id,
        q=q,
        interest=interest,
        min_age=min_age,
        max_age=max_age,
    )
