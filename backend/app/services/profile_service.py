import threading
from sqlalchemy.orm import Session
from typing import Sequence, cast
from app.models.profile import Profile
from app.models.match import Match
from app.schemas.profile import ProfileCreate, ProfileUpdate
from app.services.ml_service import get_embedding
from app.db.session import SessionLocal


_profile_analysis_state: dict[int, str] = {}


def _set_analysis_state(user_id: int, state: str):
    _profile_analysis_state[user_id] = state


def _run_embedding_job(user_id: int):
    db = SessionLocal()
    try:
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            _set_analysis_state(user_id, "failed")
            return

        interests = cast(Sequence[str], profile.interests or [])
        search_text = f"{profile.full_name} {profile.bio} {' '.join(interests)}"
        profile.embedding = get_embedding(search_text)
        db.add(profile)
        db.commit()
        _set_analysis_state(user_id, "ready")
    except Exception:
        _set_analysis_state(user_id, "failed")
    finally:
        db.close()

def create_profile(db: Session, profile_in: ProfileCreate, user_id: int):
    existing_profile = db.query(Profile).filter(Profile.user_id == user_id).first()

    if existing_profile:
        updated_values = profile_in.model_dump()
        for key, value in updated_values.items():
            setattr(existing_profile, key, value)
        setattr(existing_profile, "embedding", None)
        db.add(existing_profile)
        db.commit()
        db.refresh(existing_profile)
        profile = existing_profile
    else:
        profile = Profile(
            **profile_in.model_dump(),
            user_id=user_id,
            embedding=None,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    _set_analysis_state(user_id, "processing")
    threading.Thread(target=_run_embedding_job, args=(user_id,), daemon=True).start()
    return profile

def get_current_profile(db: Session, user_id: int):
    """Get current user's profile"""
    return db.query(Profile).filter(Profile.user_id == user_id).first()

def update_profile(db: Session, user_id: int, profile_in: ProfileUpdate):
    """Update user's profile"""
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    
    if not profile:
        return None
    
    update_data = profile_in.model_dump(exclude_unset=True)
    
    # Regenerate embedding if any text field changed
    if update_data:
        for key, value in update_data.items():
            setattr(profile, key, value)
        
        # Regenerate embedding asynchronously
        setattr(profile, "embedding", None)
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    _set_analysis_state(user_id, "processing")
    threading.Thread(target=_run_embedding_job, args=(user_id,), daemon=True).start()
    return profile


def get_profile_analysis_status(db: Session, user_id: int) -> str:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        return "missing"

    if _profile_analysis_state.get(user_id) == "failed":
        return "failed"

    if profile.embedding is None:
        return _profile_analysis_state.get(user_id, "processing")

    return "ready"

def get_matches(
    db: Session,
    user_id: int,
    q: str | None = None,
    interest: str | None = None,
    min_age: int | None = None,
    max_age: int | None = None,
):
    """Get profiles for matching with optional filters and excluding already actioned users."""
    # Get already actioned user IDs
    already_actioned = db.query(Match.matched_user_id).filter(
        Match.user_id == user_id
    ).all()
    
    already_actioned_ids = [row[0] for row in already_actioned]
    
    # Return profiles: not current user, not already actioned
    query = db.query(Profile).filter(Profile.user_id != user_id)
    
    if already_actioned_ids:
        query = query.filter(~Profile.user_id.in_(already_actioned_ids))

    if q:
        query = query.filter(
            Profile.full_name.ilike(f"%{q}%") | Profile.bio.ilike(f"%{q}%")
        )

    if interest:
        query = query.filter(Profile.interests.any(interest))

    if min_age is not None:
        query = query.filter(Profile.age >= min_age)

    if max_age is not None:
        query = query.filter(Profile.age <= max_age)
    
    return query.all()