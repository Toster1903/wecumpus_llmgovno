from pydantic import EmailStr, BaseModel
from datetime import datetime
from typing import Optional

# Что мы ждем при регистрации
class UserCreate(BaseModel):
    email: EmailStr
    password: str

# Что мы возвращаем клиенту 
class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True
