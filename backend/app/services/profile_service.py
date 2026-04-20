import threading
from sqlalchemy.orm import Session
from typing import Any, Mapping, Sequence, cast
from app.models.profile import Profile
from app.models.match import Match
from app.schemas.profile import ProfileCreate, ProfileUpdate
from app.services.ml_service import get_embedding
from app.db.session import SessionLocal


_profile_analysis_state: dict[int, str] = {}
_TEXT_FIELDS_FOR_EMBEDDING = {"full_name", "bio", "interests"}
_HABIT_KEYS = (
    "bedtime",
    "wake_time",
    "cleanliness",
    "guests",
    "noise",
    "smoking",
    "pets",
)


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


def _normalize_text(value: str | None) -> str:
    return (value or "").strip().lower()


def _interest_similarity(current: Sequence[str], candidate: Sequence[str]) -> float:
    current_set = {_normalize_text(item) for item in current if _normalize_text(item)}
    candidate_set = {_normalize_text(item) for item in candidate if _normalize_text(item)}
    union = current_set | candidate_set
    if not union:
        return 0.0
    return len(current_set & candidate_set) / len(union)


def _habits_similarity(
    current_habits: Mapping[str, Any] | None,
    candidate_habits: Mapping[str, Any] | None,
) -> float:
    left = current_habits or {}
    right = candidate_habits or {}

    comparable = 0
    matches = 0
    for key in _HABIT_KEYS:
        left_value = _normalize_text(str(left.get(key, "") or ""))
        right_value = _normalize_text(str(right.get(key, "") or ""))
        if not left_value or not right_value:
            continue
        comparable += 1
        if left_value == right_value:
            matches += 1

    if comparable == 0:
        return 0.0
    return matches / comparable


def _age_similarity(current_age: int | None, candidate_age: int | None) -> float:
    if current_age is None or candidate_age is None:
        return 0.0
    age_diff = abs(current_age - candidate_age)
    return max(0.0, 1 - (age_diff / 20))


def _roommate_score(current_profile: Profile, candidate_profile: Profile) -> float:
    interests_score = _interest_similarity(
        cast(Sequence[str], current_profile.interests or []),
        cast(Sequence[str], candidate_profile.interests or []),
    )
    habits_score = _habits_similarity(
        cast(Mapping[str, Any] | None, current_profile.private_habits),
        cast(Mapping[str, Any] | None, candidate_profile.private_habits),
    )
    age_score = _age_similarity(
        cast(int | None, current_profile.age),
        cast(int | None, candidate_profile.age),
    )
    return (interests_score * 0.5) + (habits_score * 0.35) + (age_score * 0.15)

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

    if not update_data:
        return profile

    for key, value in update_data.items():
        setattr(profile, key, value)

    should_rebuild_embedding = any(field in _TEXT_FIELDS_FOR_EMBEDDING for field in update_data)
    if should_rebuild_embedding:
        setattr(profile, "embedding", None)
    
    db.add(profile)
    db.commit()
    db.refresh(profile)

    if should_rebuild_embedding:
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

    profiles = query.all()
    current_profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not current_profile:
        return profiles

    return sorted(
        profiles,
        key=lambda candidate: _roommate_score(current_profile, candidate),
        reverse=True,
    )