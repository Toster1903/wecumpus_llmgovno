"""
Telegram notifications via aiogram Bot API.
Used by APScheduler jobs in main.py to send event reminders.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from aiogram import Bot
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.event import Event
from app.models.event_registration import EventRegistration
from app.models.user import User

logger = logging.getLogger(__name__)


def _get_bot() -> Bot | None:
    if not settings.TELEGRAM_BOT_TOKEN:
        return None
    return Bot(token=settings.TELEGRAM_BOT_TOKEN)


async def send_event_reminders() -> None:
    """Called by APScheduler every 5 minutes. Sends reminders 24h and 1h before events."""
    bot = _get_bot()
    if not bot:
        return

    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        windows = [
            ("1 день", now + timedelta(hours=23, minutes=55), now + timedelta(hours=24, minutes=5)),
            ("1 час",  now + timedelta(minutes=55),          now + timedelta(hours=1, minutes=5)),
        ]
        for label, start, end in windows:
            events = (
                db.query(Event)
                .filter(Event.start_time >= start, Event.start_time <= end)
                .all()
            )
            for event in events:
                regs = (
                    db.query(EventRegistration)
                    .filter(EventRegistration.event_id == event.id)
                    .all()
                )
                for reg in regs:
                    user = db.query(User).filter(User.id == reg.user_id).first()
                    if not user or not user.telegram_id:
                        continue
                    await _send_reminder(bot, user.telegram_id, event, label)
    finally:
        db.close()
        await bot.session.close()


async def _send_reminder(bot: Bot, telegram_id: str, event: Event, time_label: str) -> None:
    start_local = event.start_time.strftime("%d.%m %H:%M")
    location = f"\n📍 {event.location}" if event.location else ""
    text = (
        f"⏰ Напоминание — через {time_label}!\n\n"
        f"<b>{event.title}</b>{location}\n"
        f"🕐 {start_local}"
    )
    try:
        await bot.send_message(chat_id=int(telegram_id), text=text, parse_mode="HTML")
    except Exception as exc:
        logger.warning("Failed to send Telegram reminder to %s: %s", telegram_id, exc)


async def notify_event_registered(telegram_id: str, event: Event) -> None:
    """Send confirmation when user registers for an event."""
    bot = _get_bot()
    if not bot or not telegram_id:
        return
    start_local = event.start_time.strftime("%d.%m.%Y в %H:%M")
    location = f"\n📍 {event.location}" if event.location else ""
    text = (
        f"✅ Вы записались на мероприятие!\n\n"
        f"<b>{event.title}</b>{location}\n"
        f"🕐 {start_local}\n\n"
        f"Пришлю напоминание за сутки и за час до начала."
    )
    try:
        await bot.send_message(chat_id=int(telegram_id), text=text, parse_mode="HTML")
    except Exception as exc:
        logger.warning("Failed to send registration confirmation to %s: %s", telegram_id, exc)
    finally:
        await bot.session.close()
