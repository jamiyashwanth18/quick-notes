"""Unit tests for the logic behind GET/PUT /settings (US-007.2).

These exercise `app.services.settings` directly against an in-memory SQLite
database, and the route functions' own signatures, with no HTTP layer and no
migrations: the Alembic migration that ships the `settings` table
(alembic/versions/0003_settings.py) is exercised by the integration suite, which
runs the real migrations.
"""

import inspect
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Note, Settings
from app.routers.settings import get_settings, update_settings
from app.services.export import export_notes_document
from app.services.settings import (
    DEFAULT_EXPORT_LIMIT,
    SETTINGS_ID,
    get_settings_record,
    update_export_limit,
)


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine, tables=[Settings.__table__, Note.__table__])
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()


def _make_note(session: Session, title: str, created_at: datetime) -> Note:
    note = Note(id=str(uuid4()), title=title, body="", created_at=created_at)
    session.add(note)
    session.commit()
    return note


def test_ac018_the_default_export_limit_is_100(session: Session) -> None:
    settings = get_settings_record(session)

    assert settings.export_limit == 100
    assert DEFAULT_EXPORT_LIMIT == 100


def test_ac018_reading_the_setting_never_creates_a_second_row(session: Session) -> None:
    first = get_settings_record(session)
    second = get_settings_record(session)

    assert first.id == second.id == SETTINGS_ID
    assert session.query(Settings).count() == 1


def test_ac019_saving_a_new_limit_changes_what_a_later_read_returns(session: Session) -> None:
    update_export_limit(session, 7)

    settings = get_settings_record(session)

    assert settings.export_limit == 7


def test_ac019_saving_a_new_limit_updates_the_single_row_rather_than_adding_one(
    session: Session,
) -> None:
    get_settings_record(session)  # creates the row at its default

    update_export_limit(session, 3)

    assert session.query(Settings).count() == 1


def test_ac019_subsequent_exports_keep_only_the_most_recent_n_notes(session: Session) -> None:
    base = datetime(2026, 1, 1, tzinfo=UTC)
    excluded = _make_note(session, "Too old once the limit shrinks", base)
    kept = [_make_note(session, f"Kept {i}", base + timedelta(minutes=i + 1)) for i in range(2)]

    update_export_limit(session, 2)
    export_limit = get_settings_record(session).export_limit
    document = export_notes_document(session, limit=export_limit)

    assert document is not None
    assert excluded.title not in document.content
    for note in kept:
        assert note.title in document.content


def test_ac020_reading_the_setting_takes_no_signed_in_user(session: Session) -> None:
    # No parameter named after the signed-in user: GET /settings works for any
    # visitor, signed in or not (AC-020).
    params = inspect.signature(get_settings).parameters
    assert "session" in params
    assert not any("user" in name for name in params)


def test_ac020_writing_the_setting_takes_no_signed_in_user(session: Session) -> None:
    # Same for PUT /settings: no current-user dependency gates the write (AC-020).
    params = inspect.signature(update_settings).parameters
    assert set(params) == {"body", "session"}
