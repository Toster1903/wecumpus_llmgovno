import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_verification_message(to_email: str, token: str) -> MIMEMultipart:
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Подтвердите ваш email — Wecampus"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    html = f"""
<html><body style="font-family:sans-serif;color:#222;">
  <h2>Добро пожаловать в Wecampus!</h2>
  <p>Нажмите кнопку ниже, чтобы подтвердить email. Ссылка действительна 24 часа.</p>
  <p>
    <a href="{verify_url}"
       style="display:inline-block;padding:12px 24px;background:#6c63ff;color:#fff;
              border-radius:8px;text-decoration:none;font-weight:bold;">
      Подтвердить email
    </a>
  </p>
  <p style="color:#888;font-size:12px;">Если вы не регистрировались — просто проигнорируйте письмо.</p>
</body></html>
"""
    msg.attach(MIMEText(html, "html"))
    return msg


def send_verification_email(to_email: str, token: str) -> None:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured, skipping email to %s", to_email)
        return

    msg = _build_verification_message(to_email, token)
    try:
        # Try STARTTLS on port 587 first, fall back to SSL on port 465
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
    except Exception:
        logger.exception("Failed to send verification email to %s", to_email)
        raise
