"""Integration tests for the notes export endpoint (US-005).

GET /notes/export returns the most recent notes as a single Markdown (.md) file,
directly in the response body, with a filename derived from today's date. When there
are no notes, it reports that there is nothing to export instead of forcing an empty
file. There is no sign-in for this app, so these tests use the plain `client` fixture.
"""

import re
from typing import Any

from fastapi.testclient import TestClient


def _filename_from(response: Any) -> str:
    """The filename offered for the exported file, out of its Content-Disposition header."""
    disposition = response.headers.get("content-disposition", "")
    match = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)"?', disposition)
    assert match, f"No filename found in Content-Disposition header: {disposition!r}"
    return match.group(1)


def _error_message(payload: Any) -> str:
    """The error text out of a failed response, wherever the API puts it."""
    if isinstance(payload, dict):
        detail = payload.get("detail", payload.get("message", payload))
        return str(detail)
    return str(payload)


def test_tc024_export_returns_a_single_direct_markdown_file(client: TestClient) -> None:
    create_response = client.post(
        "/notes",
        json={"title": "Weekend plans", "body": "Hike on Saturday, brunch on Sunday"},
    )
    assert create_response.status_code == 201, create_response.text

    export_response = client.get("/notes/export")

    assert export_response.status_code == 200, export_response.text
    assert "markdown" in export_response.headers.get("content-type", "").lower()

    filename = _filename_from(export_response)
    assert filename.endswith(".md")

    body_text = export_response.text
    assert "Weekend plans" in body_text

    for header_name in export_response.headers:
        lowered = header_name.lower()
        assert "email" not in lowered
        assert "cloud" not in lowered
    assert "@" not in body_text
    assert "http://" not in body_text.lower()
    assert "https://" not in body_text.lower()


def test_tc026_exported_filename_is_derived_from_todays_date(client: TestClient) -> None:
    create_response = client.post("/notes", json={"title": "Trip notes", "body": "Pack sunscreen"})
    assert create_response.status_code == 201, create_response.text

    export_response = client.get("/notes/export")

    assert export_response.status_code == 200, export_response.text
    filename = _filename_from(export_response)
    assert filename == "2026-11-25-notes.md"


def test_tc028_export_with_no_notes_gives_no_file(client: TestClient) -> None:
    list_response = client.get("/notes")
    assert list_response.status_code == 200, list_response.text
    assert list_response.json() == []

    export_response = client.get("/notes/export")

    assert export_response.status_code == 404, export_response.text
    message = _error_message(export_response.json()).lower()
    assert "nothing" in message and "export" in message

    assert "markdown" not in export_response.headers.get("content-type", "").lower()
    assert "content-disposition" not in {h.lower() for h in export_response.headers}
