"""Read and update the single export-limit setting (US-007.1, US-007.2).

There is no sign-in and no per-visitor setting (AC-020): every visitor reads and
writes the same one row, identified by a fixed id since the table never holds more
than one. Nothing seeds that row ahead of time, so `get_settings_record` creates it,
at its default of 100 (AC-018), the first time anyone asks.
"""

from sqlalchemy.orm import Session

from app.models import Settings

# The export limit a fresh database has never been asked to change (AC-018).
DEFAULT_EXPORT_LIMIT = 100

# The single settings row's fixed id: the table only ever holds this one row.
SETTINGS_ID = "default"


def get_settings_record(session: Session) -> Settings:
    """Return the single settings row, creating it at the default limit if absent (AC-018)."""
    settings = session.get(Settings, SETTINGS_ID)
    if settings is None:
        settings = Settings(id=SETTINGS_ID, export_limit=DEFAULT_EXPORT_LIMIT)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


def update_export_limit(session: Session, export_limit: int) -> Settings:
    """Change the export limit on the single settings row and return it (AC-019)."""
    settings = get_settings_record(session)
    settings.export_limit = export_limit
    session.commit()
    session.refresh(settings)
    return settings
