"""Unit tests for the logic behind GET /notes/export (US-005.1).

These exercise `app.services.export` directly against an in-memory SQLite database,
with no HTTP layer and no migrations: the Alembic migrations are exercised by the
integration suite, which runs the real ones.
"""

from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Note
from app.services.export import (
    build_markdown,
    export_notes_document,
    filename_from_date,
)


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine, tables=[Note.__table__])
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()


def _make_note(session: Session, title: str, created_at: datetime, body: str = "") -> Note:
    note = Note(id=str(uuid4()), title=title, body=body, created_at=created_at)
    session.add(note)
    session.commit()
    return note


def test_ac013_assembles_one_markdown_document_from_every_note(session: Session) -> None:
    base = datetime(2026, 1, 1, tzinfo=UTC)
    _make_note(session, "First", base, body="First body")
    _make_note(session, "Second", base + timedelta(minutes=1), body="Second body")

    document = export_notes_document(session)

    assert document is not None
    assert "# Notes export" in document.content
    assert "First" in document.content
    assert "First body" in document.content
    assert "Second" in document.content
    assert "Second body" in document.content


def test_ac013_orders_the_document_newest_note_first(session: Session) -> None:
    base = datetime(2026, 1, 1, tzinfo=UTC)
    _make_note(session, "Oldest", base)
    _make_note(session, "Newest", base + timedelta(minutes=1))

    document = export_notes_document(session)

    assert document is not None
    assert document.content.index("Newest") < document.content.index("Oldest")


def test_ac013_limits_the_export_to_the_most_recent_n_notes(session: Session) -> None:
    base = datetime(2026, 1, 1, tzinfo=UTC)
    _make_note(session, "Too old to include", base)
    _make_note(session, "Included", base + timedelta(minutes=1))
    _make_note(session, "Also included", base + timedelta(minutes=2))

    document = export_notes_document(session, limit=2)

    assert document is not None
    assert "Included" in document.content
    assert "Also included" in document.content
    assert "Too old to include" not in document.content


def test_ac013_build_markdown_renders_the_title_timestamp_and_body(session: Session) -> None:
    note = _make_note(session, "Standalone", datetime(2026, 1, 1, tzinfo=UTC), body="Line one")

    content = build_markdown([note])

    assert "## Standalone" in content
    assert "2026-01-01T00:00:00" in content
    assert "Line one" in content


def test_ac014_filename_is_derived_from_the_given_date() -> None:
    assert filename_from_date(date(2026, 11, 25)) == "2026-11-25-notes.md"


def test_ac014_export_document_filename_uses_the_given_date(session: Session) -> None:
    _make_note(session, "Any note", datetime(2026, 1, 1, tzinfo=UTC))

    document = export_notes_document(session, today=date(2026, 3, 7))

    assert document is not None
    assert document.filename == "2026-03-07-notes.md"


def test_ac015_returns_none_when_there_are_no_notes_to_export(session: Session) -> None:
    assert export_notes_document(session) is None


def test_ac015_an_empty_store_never_builds_a_document(session: Session) -> None:
    # No document is returned for the router to turn into a download: the shared
    # store has nothing in it, so there is no file to force on the visitor (AC-015).
    assert export_notes_document(session, today=date(2026, 1, 1)) is None
