from sqlalchemy.orm import Session
from app.models.profile import Profile
from app.schemas.profile import ProfileCreate
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

def get_matches(db: Session, user_id: int):
    # Пока просто возвращаем все профили, кроме своего
    return db.query(Profile).filter(Profile.user_id != user_id).all()