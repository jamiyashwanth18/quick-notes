"""Integration tests for the empty-state story (US-003).

GET /notes lists the notes in the shared store; the UI shows a friendly empty-state
message when that list is empty, and shows the list once a note exists. There is no
sign-in for this app, so these tests use the plain `client` fixture. Each test runs in
its own rolled-back transaction, so the store starts empty for every test.
"""

from typing import Any

from fastapi.testclient import TestClient


def _notes_in(payload: Any) -> list[dict]:
    """The list of notes out of a GET /notes response, whatever envelope it uses."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("notes", "items", "results"):
            if isinstance(payload.get(key), list):
                return payload[key]
    raise AssertionError(f"GET /notes did not return a list of notes: {payload!r}")


def test_tc001_list_notes_returns_empty_when_store_has_no_notes(
    client: TestClient,
) -> None:
    response = client.get("/notes")

    assert response.status_code == 200, response.text
    notes = _notes_in(response.json())
    assert notes == []


def test_tc003_listing_notes_after_creating_the_first_note_returns_that_note(
    client: TestClient,
) -> None:
    create_response = client.post(
        "/notes",
        json={"title": "First note", "body": "This is my first note."},
    )

    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["title"] == "First note"
    assert created["body"] == "This is my first note."

    list_response = client.get("/notes")

    assert list_response.status_code == 200, list_response.text
    notes = _notes_in(list_response.json())
    assert len(notes) == 1
    assert notes[0].get("title") == "First note"
