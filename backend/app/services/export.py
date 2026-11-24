"""Assemble the shared notes into one Markdown export document (US-005.1).

`export_notes_document` takes its `limit` as a parameter rather than reading the
`settings` table itself: the caller (the export route, app.routers.notes) reads the
current export-limit setting (US-007) and passes it in, so this module and its tests
stay free of any dependency on the settings entity.
"""

from dataclasses import dataclass
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Note

# The default number of most recent notes an export includes (AC-013), and this
# module's own default for `limit` below. The live export route overrides it with
# the current export-limit setting (AC-019); this constant is what a caller gets
# when it does not.
EXPORT_LIMIT = 100


@dataclass(frozen=True)
class ExportDocument:
    """A ready-to-send Markdown export: its filename and its full content."""

    filename: str
    content: str


def filename_from_date(today: date) -> str:
    """Derive the export's filename from the given date (AC-014).

    `today` is a parameter rather than read from the clock in here, so the same
    function used by the live export at `datetime.now(UTC).date()` can also be
    exercised, deterministically, against any date in a test.
    """
    return f"{today.isoformat()}-notes.md"


def build_markdown(notes: list[Note]) -> str:
    """Assemble one Markdown document from the given notes, newest first (AC-013).

    `notes` is expected already ordered newest-first (as `export_notes_document`
    below selects them); this function only renders what it is given.
    """
    lines = ["# Notes export", ""]
    for note in notes:
        lines.append(f"## {note.title}")
        lines.append("")
        lines.append(f"*{note.created_at.isoformat()}*")
        lines.append("")
        if note.body:
            lines.extend(note.body.splitlines())
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def export_notes_document(
    session: Session, *, limit: int = EXPORT_LIMIT, today: date | None = None
) -> ExportDocument | None:
    """Return the export document for the most recent `limit` notes (AC-013, AC-014).

    Returns `None` when the shared store has no notes at all, so the caller can tell
    the visitor there is nothing to export instead of forcing an empty file on them
    (AC-015).
    """
    notes = list(session.scalars(select(Note).order_by(Note.created_at.desc()).limit(limit)).all())
    if not notes:
        return None
    when = today if today is not None else datetime.now(UTC).date()
    return ExportDocument(filename=filename_from_date(when), content=build_markdown(notes))
