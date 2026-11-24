"""Unit tests for the logic behind GET /notes (US-002.1).

These exercise `list_note_records` directly against an in-memory SQLite database, with
no HTTP layer and no migrations: the Alembic migration that ships the `notes` table
(alembic/versions/0002_notes.py) is exercised by the integration suite, which runs the
real migrations.
"""

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Note
from app.routers.notes import delete_note_record, list_note_records
from app.services.export import EXPORT_LIMIT, export_notes_document


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine, tables=[Note.__table__])
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()


def _make_note(session: Session, title: str, created_at: datetime) -> Note:
    note = Note(id=str(uuid4()), title=title, body="", created_at=created_at)
    session.add(note)
    session.commit()
    return note


def test_ac005_lists_all_notes_newest_created_first(session: Session) -> None:
    base = datetime(2026, 1, 1, tzinfo=UTC)
    oldest = _make_note(session, "Oldest", base)
    middle = _make_note(session, "Middle", base + timedelta(minutes=1))
    newest = _make_note(session, "Newest", base + timedelta(minutes=2))

    notes = list_note_records(session)

    assert [note.id for note in notes] == [newest.id, middle.id, oldest.id]


def test_ac005_returns_an_empty_list_when_the_store_has_no_notes(session: Session) -> None:
    assert list_note_records(session) == []


def test_ac006_a_note_created_after_the_rest_appears_at_the_top(session: Session) -> None:
    base = datetime(2026, 1, 1, tzinfo=UTC)
    first = _make_note(session, "First visitor's note", base)
    second = _make_note(session, "Second visitor's note", base + timedelta(seconds=1))

    notes = list_note_records(session)

    assert notes[0].id == second.id
    assert notes[-1].id == first.id


def test_ac006_a_single_note_appears_alone_at_the_top(session: Session) -> None:
    only = _make_note(session, "Only note", datetime(2026, 1, 1, tzinfo=UTC))

    notes = list_note_records(session)

    assert [note.id for note in notes] == [only.id]


def test_ac010_deletes_a_note_and_it_no_longer_appears_in_the_store(session: Session) -> None:
    note = _make_note(session, "To be deleted", datetime(2026, 1, 1, tzinfo=UTC))

    deleted = delete_note_record(session, note.id)

    assert deleted is True
    assert session.get(Note, note.id) is None
    assert list_note_records(session) == []


def test_ac010_leaves_other_notes_in_the_shared_store_untouched(session: Session) -> None:
    base = datetime(2026, 1, 1, tzinfo=UTC)
    keep = _make_note(session, "Keep me", base)
    remove = _make_note(session, "Remove me", base + timedelta(minutes=1))

    deleted = delete_note_record(session, remove.id)

    assert deleted is True
    notes = list_note_records(session)
    assert [note.id for note in notes] == [keep.id]


def test_ac010_returns_false_when_the_note_does_not_exist(session: Session) -> None:
    deleted = delete_note_record(session, str(uuid4()))

    assert deleted is False


def test_ac012_once_deleted_a_note_cannot_be_recovered_by_a_second_delete(
    session: Session,
) -> None:
    note = _make_note(session, "Gone for good", datetime(2026, 1, 1, tzinfo=UTC))

    first = delete_note_record(session, note.id)
    second = delete_note_record(session, note.id)

    assert first is True
    assert second is False
    assert session.get(Note, note.id) is None


def test_ac016_the_default_export_limit_is_100() -> None:
    # The export limit setting's default (AC-016) is 100 notes.
    assert EXPORT_LIMIT == 100


def test_ac016_exports_only_the_100_most_recent_notes_when_there_are_more(
    session: Session,
) -> None:
    base = datetime(2026, 1, 1, tzinfo=UTC)
    excess = 5
    total = EXPORT_LIMIT + excess
    notes = [
        _make_note(session, f"Note-{i:04d}-end", base + timedelta(minutes=i)) for i in range(total)
    ]

    # The export limit setting is at its default of 100 (AC-016): no `limit` override.
    document = export_notes_document(session)

    assert document is not None
    excluded = notes[:excess]
    included = notes[excess:]
    assert len(included) == EXPORT_LIMIT
    for note in excluded:
        assert note.title not in document.content
    for note in included:
        assert note.title in document.content


def test_ac017_exports_every_note_when_there_are_fewer_than_the_limit(
    session: Session,
) -> None:
    base = datetime(2026, 1, 1, tzinfo=UTC)
    notes = [_make_note(session, f"Few {i}", base + timedelta(minutes=i)) for i in range(3)]
    assert len(notes) < EXPORT_LIMIT

    document = export_notes_document(session)

    assert document is not None
    for note in notes:
        assert note.title in document.content
