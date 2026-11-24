"""Integration tests for the note creation endpoint (US-001).

POST /notes creates a note after validating a required title (1-100 characters) and a
body of up to 2,000 characters; GET /notes lists the notes in the shared store. There is
no sign-in for this app, so these tests use the plain `client` fixture.
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


def _error_message(payload: Any) -> str:
    """The error text out of a failed response, wherever the API puts it."""
    if isinstance(payload, dict):
        detail = payload.get("detail", payload.get("message", payload))
        return str(detail)
    return str(payload)


def test_tc010_create_note_with_valid_title_and_body(client: TestClient) -> None:
    body_text = "Let's meet at noon in the main hall."

    create_response = client.post(
        "/notes", json={"title": "Team lunch", "body": body_text}
    )

    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["title"] == "Team lunch"
    assert created["body"] == body_text

    list_response = client.get("/notes")

    assert list_response.status_code == 200, list_response.text
    notes = _notes_in(list_response.json())
    assert any(note.get("title") == "Team lunch" for note in notes)


def test_tc012_reject_note_creation_with_empty_title(client: TestClient) -> None:
    response = client.post("/notes", json={"title": "", "body": "Some body text."})

    assert response.status_code == 400, response.text
    message = _error_message(response.json()).lower()
    assert "title" in message
    assert "required" in message


def test_tc014_reject_note_creation_with_title_over_100_characters(
    client: TestClient,
) -> None:
    long_title = "A" * 101

    response = client.post("/notes", json={"title": long_title, "body": "Body text."})

    assert response.status_code == 400, response.text
    message = _error_message(response.json()).lower()
    assert "title" in message
    assert "100" in message or "long" in message


def test_tc016_reject_note_creation_with_body_over_2000_characters(
    client: TestClient,
) -> None:
    long_body = "A" * 2001

    response = client.post("/notes", json={"title": "Long note", "body": long_body})

    assert response.status_code == 400, response.text
    message = _error_message(response.json()).lower()
    assert "body" in message
    assert "2000" in message or "2,000" in message or "long" in message
