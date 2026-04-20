from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserOut
from app.services import user_service

router = APIRouter()

@router.post("/", response_model=UserOut)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    return user_service.create_new_user(db, user_in)
