"""Email service — sends notifications via SMTP if configured.

If SMTP_HOST is not set, emails are silently skipped (logged at INFO).
"""

import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    """Whether SMTP is configured to send mail."""
    return bool(settings.smtp_host and settings.smtp_from)


def send_email(*, to: str, subject: str, html: str, text: str) -> bool:
    """Send a plaintext + HTML email. Returns True on success.

    Silently no-ops if SMTP is not configured. Catches all exceptions —
    email failures must not break the calling task.
    """
    if not is_configured():
        logger.info("SMTP not configured; skipping email to %s", to)
        return False

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user and settings.smtp_password:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
        logger.info("Sent email to %s: %s", to, subject)
        return True
    except Exception as exc:  # noqa: BLE001 — never let email break callers
        logger.warning("Email send failed for %s: %s", to, exc)
        return False


def send_processing_complete(
    *,
    to: str,
    user_name: str,
    document_name: str,
    document_id: str,
    risk_score: str | None,
    doc_type: str | None,
) -> bool:
    """Notify a user that their contract finished processing."""
    risk_label = {
        "red": "High Risk",
        "amber": "Medium Risk",
        "green": "Low Risk",
    }.get(risk_score or "", "Unknown")

    type_label = (doc_type or "contract").replace("_", " ").title()
    link = f"{settings.app_url.rstrip('/')}/documents/{document_id}"

    subject = f"DocPilot: {document_name} is ready"
    text = (
        f"Hi {user_name},\n\n"
        f"Your {type_label.lower()} '{document_name}' has finished processing.\n"
        f"Overall risk: {risk_label}\n\n"
        f"View the analysis: {link}\n\n"
        f"You can disable these emails in Settings.\n"
    )
    html = f"""
    <html>
      <body style="font-family: -apple-system, system-ui, sans-serif; color: #1f2937;">
        <h2 style="margin-bottom: 8px;">Your contract is ready</h2>
        <p>Hi {user_name},</p>
        <p>
          Your {type_label.lower()} <strong>{document_name}</strong> has finished
          processing.
        </p>
        <p>Overall risk: <strong>{risk_label}</strong></p>
        <p>
          <a href="{link}" style="display:inline-block;background:#0f172a;color:#fff;
             padding:10px 16px;border-radius:6px;text-decoration:none;">
            View analysis
          </a>
        </p>
        <p style="color:#6b7280;font-size:12px;margin-top:32px;">
          You can disable these emails in Settings.
        </p>
      </body>
    </html>
    """
    return send_email(to=to, subject=subject, html=html, text=text)
