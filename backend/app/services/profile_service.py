from sqlalchemy.orm import Session
from typing import Sequence, cast
from app.models.profile import Profile
from app.models.match import Match
from app.schemas.profile import ProfileCreate, ProfileUpdate
from app.services.ml_service import get_embedding

def create_profile(db: Session, profile_in: ProfileCreate, user_id: int):
    # Собираем все текстовые данные в одну строку для ML
    search_text = f"{profile_in.full_name} {profile_in.bio} {' '.join(profile_in.interests)}"
    
    # Генерируем вектор
    vector = get_embedding(search_text)
    
    new_profile = Profile(
        **profile_in.model_dump(),
        user_id=user_id,
        embedding=vector
    )
    
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return new_profile

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
        
        # Regenerate embedding
        interests = cast(Sequence[str], profile.interests or [])
        search_text = f"{profile.full_name} {profile.bio} {' '.join(interests)}"
        profile.embedding = get_embedding(search_text)
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

def get_matches(db: Session, user_id: int):
    """Get all profiles except current user's, excluding already actioned (liked/skipped)"""
    # Get already actioned user IDs
    already_actioned = db.query(Match.matched_user_id).filter(
        Match.user_id == user_id
    ).all()
    
    already_actioned_ids = [row[0] for row in already_actioned]
    
    # Return profiles: not current user, not already actioned
    query = db.query(Profile).filter(Profile.user_id != user_id)
    
    if already_actioned_ids:
        query = query.filter(~Profile.user_id.in_(already_actioned_ids))
    
    return query.all()