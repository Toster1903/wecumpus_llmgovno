import importlib
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash



model: Optional[Any] = None


def _get_model() -> Any:
    global model
    if model is None:
        try:
            sentence_transformers = importlib.import_module("sentence_transformers")
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                'Package "sentence-transformers" is not installed. Install it with: pip install sentence-transformers'
            ) from exc
        model = sentence_transformers.SentenceTransformer("all-MiniLM-L6-v2")
    return model


def create_new_user(db: Session, user_data: UserCreate):
    hashed_pass = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pass
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def get_embedding(text: str):
    return _get_model().encode(text).tolist()