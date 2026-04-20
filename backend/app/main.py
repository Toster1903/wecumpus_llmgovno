from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import users, profiles, auth
from app.db.session import engine, Base
from sqlalchemy import text
from app.models.user import User
from app.models.profile import Profile

# Создаем расширение vector перед созданием таблиц
with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
    conn.commit()

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Wecupmus API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(profiles.router, prefix="/api/v1/profiles", tags=["profiles"])
