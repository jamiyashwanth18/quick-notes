"""Unit tests for the logic behind POST /notes (US-001.3).

These exercise `NoteCreate`'s own validation and `create_note_record`'s persistence
directly, against an in-memory SQLite database, with no HTTP layer and no migrations:
the Alembic migration that ships the `notes` table (alembic/versions/0002_notes.py) is
exercised by the integration suite, which runs the real migrations.
"""

from collections.abc import Iterator

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Note
from app.routers.notes import create_note_record
from app.schemas import NoteCreate


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine, tables=[Note.__table__])
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()


def test_ac001_saves_a_valid_note_and_it_appears_in_the_store(session: Session) -> None:
    body = NoteCreate(title="Milk", body="Buy two litres")

    note = create_note_record(session, body)

    assert note.id
    assert note.title == "Milk"
    assert note.body == "Buy two litres"
    assert note.created_at is not None
    stored = session.get(Note, note.id)
    assert stored is not None
    assert stored.title == "Milk"


def test_ac001_body_defaults_to_empty_when_omitted(session: Session) -> None:
    body = NoteCreate(title="Just a title")

    note = create_note_record(session, body)

    assert note.body == ""


def test_ac002_rejects_a_missing_title(session: Session) -> None:
    with pytest.raises(ValidationError):
        NoteCreate(body="no title here")


def test_ac002_rejects_an_empty_title(session: Session) -> None:
    with pytest.raises(ValidationError):
        NoteCreate(title="", body="still no title")


def test_ac003_accepts_a_title_of_exactly_100_characters(session: Session) -> None:
    title = "a" * 100

    note = create_note_record(session, NoteCreate(title=title))

    assert note.title == title


def test_ac003_rejects_a_title_over_100_characters(session: Session) -> None:
    with pytest.raises(ValidationError):
        NoteCreate(title="a" * 101)


def test_ac004_accepts_a_body_of_exactly_2000_characters(session: Session) -> None:
    text = "a" * 2000

    note = create_note_record(session, NoteCreate(title="Long note", body=text))

    assert note.body == text


def test_ac004_rejects_a_body_over_2000_characters(session: Session) -> None:
    with pytest.raises(ValidationError):
        NoteCreate(title="Long note", body="a" * 2001)
