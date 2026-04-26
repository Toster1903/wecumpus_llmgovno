import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.api.v1.endpoints import (
    users, profiles, auth, matches, messages, clubs,
    events, rides, plan, market, posts, ai, feed,
)
from app.db.session import engine, Base
from app.models.user import User
from app.models.profile import Profile
from app.models.match import Match
from app.models.message import Message
from app.models.club import Club
from app.models.club_member import ClubMember
from app.models.club_invite import ClubInvite
from app.models.event import Event
from app.models.ride import Ride, RidePassenger
from app.models.meeting import Meeting, MeetingParticipant
from app.models.market_item import MarketItem
from app.models.post import Post

logger = logging.getLogger(__name__)


def init_database() -> None:
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))

        Base.metadata.create_all(bind=engine)

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;"))
            conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS private_habits JSONB;"))
            conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS club_id INTEGER;"))
            conn.execute(text("ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_club_id ON messages (club_id);"))
            # market images
            conn.execute(text("ALTER TABLE market_items ADD COLUMN IF NOT EXISTS image_urls TEXT[];"))
    except SQLAlchemyError:
        logger.exception("Database initialization failed")

app = FastAPI(title="Wecupmus API")

static_dir = Path(__file__).resolve().parent / "static"
(static_dir / "club_avatars").mkdir(parents=True, exist_ok=True)
(static_dir / "market_images").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_database()

app.include_router(auth.router,     prefix="/api/v1/auth",    tags=["auth"])
app.include_router(users.router,    prefix="/api/v1/users",   tags=["users"])
app.include_router(profiles.router, prefix="/api/v1/profiles",tags=["profiles"])
app.include_router(matches.router,  prefix="/api/v1/matches", tags=["matches"])
app.include_router(messages.router, prefix="/api/v1/messages",tags=["messages"])
app.include_router(clubs.router,    prefix="/api/v1/clubs",   tags=["clubs"])
app.include_router(events.router,   prefix="/api/v1/events",  tags=["events"])
app.include_router(rides.router,    prefix="/api/v1/rides",   tags=["rides"])
app.include_router(plan.router,     prefix="/api/v1/plan",    tags=["plan"])
app.include_router(market.router,   prefix="/api/v1/market",  tags=["market"])
app.include_router(posts.router,    prefix="/api/v1/posts",   tags=["posts"])
app.include_router(ai.router,       prefix="/api/v1/ai",      tags=["ai"])
app.include_router(feed.router,     prefix="/api/v1/feed",    tags=["feed"])
