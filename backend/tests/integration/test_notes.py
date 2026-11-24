"""Integration tests for the note creation endpoint (US-001).

POST /notes creates a note after validating a required title (1-100 characters) and a
body of up to 2,000 characters; GET /notes lists the notes in the shared store. There is
no sign-in for this app, so these tests use the plain `client` fixture.
"""

import re
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

    create_response = client.post("/notes", json={"title": "Team lunch", "body": body_text})

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


def test_tc005_list_notes_returns_newest_first_order(client: TestClient) -> None:
    first_response = client.post("/notes", json={"title": "First note", "body": "First body"})
    assert first_response.status_code == 201, first_response.text

    second_response = client.post("/notes", json={"title": "Second note", "body": "Second body"})
    assert second_response.status_code == 201, second_response.text

    third_response = client.post("/notes", json={"title": "Third note", "body": "Third body"})
    assert third_response.status_code == 201, third_response.text

    list_response = client.get("/notes")

    assert list_response.status_code == 200, list_response.text
    notes = _notes_in(list_response.json())
    titles = [note.get("title") for note in notes]
    assert titles == ["Third note", "Second note", "First note"]


def test_tc008_newly_created_note_appears_at_top_of_list(client: TestClient) -> None:
    old_first_response = client.post("/notes", json={"title": "Old note 1", "body": "Old body 1"})
    assert old_first_response.status_code == 201, old_first_response.text

    old_second_response = client.post("/notes", json={"title": "Old note 2", "body": "Old body 2"})
    assert old_second_response.status_code == 201, old_second_response.text

    before_response = client.get("/notes")
    assert before_response.status_code == 200, before_response.text
    before_titles = [note.get("title") for note in _notes_in(before_response.json())]
    assert before_titles == ["Old note 2", "Old note 1"]

    create_response = client.post(
        "/notes", json={"title": "Brand new note", "body": "Just created"}
    )
    assert create_response.status_code == 201, create_response.text

    after_response = client.get("/notes")
    assert after_response.status_code == 200, after_response.text
    after_titles = [note.get("title") for note in _notes_in(after_response.json())]
    assert after_titles == ["Brand new note", "Old note 2", "Old note 1"]


def test_tc046_viewing_the_list_never_removes_a_note(client: TestClient) -> None:
    create_response = client.post(
        "/notes", json={"title": "Water the plants", "body": "Every Tuesday"}
    )
    assert create_response.status_code == 201, create_response.text

    first_list_response = client.get("/notes")
    assert first_list_response.status_code == 200, first_list_response.text
    first_titles = [note.get("title") for note in _notes_in(first_list_response.json())]
    assert "Water the plants" in first_titles

    second_list_response = client.get("/notes")
    assert second_list_response.status_code == 200, second_list_response.text
    second_titles = [note.get("title") for note in _notes_in(second_list_response.json())]
    assert "Water the plants" in second_titles


def test_tc047_deleting_a_note_permanently_removes_it_from_the_shared_store(
    client: TestClient,
) -> None:
    create_response = client.post(
        "/notes", json={"title": "Call the plumber", "body": "About the leak"}
    )
    assert create_response.status_code == 201, create_response.text
    note_id = create_response.json()["id"]

    list_response = client.get("/notes")
    assert list_response.status_code == 200, list_response.text
    titles_before = [note.get("title") for note in _notes_in(list_response.json())]
    assert "Call the plumber" in titles_before

    delete_response = client.delete(f"/notes/{note_id}")
    assert delete_response.status_code in (200, 204), delete_response.text

    after_response = client.get("/notes")
    assert after_response.status_code == 200, after_response.text
    titles_after = [note.get("title") for note in _notes_in(after_response.json())]
    assert "Call the plumber" not in titles_after


def test_tc049_a_note_without_its_own_delete_request_stays_while_another_is_deleted(
    client: TestClient,
) -> None:
    keep_response = client.post(
        "/notes", json={"title": "Schedule dentist appointment", "body": "Next month"}
    )
    assert keep_response.status_code == 201, keep_response.text

    temp_response = client.post("/notes", json={"title": "Temporary note", "body": "to be removed"})
    assert temp_response.status_code == 201, temp_response.text
    temp_id = temp_response.json()["id"]

    delete_response = client.delete(f"/notes/{temp_id}")
    assert delete_response.status_code in (200, 204), delete_response.text

    list_response = client.get("/notes")
    assert list_response.status_code == 200, list_response.text
    titles = [note.get("title") for note in _notes_in(list_response.json())]
    assert "Schedule dentist appointment" in titles
    assert "Temporary note" not in titles


def test_tc051_a_deleted_note_cannot_be_found_or_restored(client: TestClient) -> None:
    create_response = client.post(
        "/notes", json={"title": "Renew library card", "body": "Due in June"}
    )
    assert create_response.status_code == 201, create_response.text
    note_id = create_response.json()["id"]

    delete_response = client.delete(f"/notes/{note_id}")
    assert delete_response.status_code in (200, 204), delete_response.text

    list_response = client.get("/notes")
    assert list_response.status_code == 200, list_response.text
    titles = [note.get("title") for note in _notes_in(list_response.json())]
    assert "Renew library card" not in titles

    second_delete_response = client.delete(f"/notes/{note_id}")
    assert second_delete_response.status_code == 404, second_delete_response.text


def test_tc018_export_returns_only_the_100_most_recent_notes_when_over_the_limit(
    client: TestClient,
) -> None:
    total_notes = 105
    for index in range(1, total_notes + 1):
        title = f"Note-{index:03d}"
        response = client.post("/notes", json={"title": title, "body": f"Body {index}"})
        assert response.status_code == 201, response.text

    export_response = client.get("/notes/export")

    assert export_response.status_code == 200, export_response.text
    content = export_response.text
    entries = re.findall(r"^## (Note-\d{3})$", content, flags=re.MULTILINE)
    assert len(entries) == 100

    for index in range(6, total_notes + 1):
        assert f"Note-{index:03d}" in content
    for index in range(1, 6):
        assert f"Note-{index:03d}" not in content


def test_tc020_export_includes_all_notes_when_fewer_than_the_limit_exist(
    client: TestClient,
) -> None:
    titles = [f"Note-{letter}" for letter in "ABCDEFG"]
    for title in titles:
        response = client.post("/notes", json={"title": title, "body": f"Body for {title}"})
        assert response.status_code == 201, response.text

    export_response = client.get("/notes/export")

    assert export_response.status_code == 200, export_response.text
    content = export_response.text
    entries = re.findall(r"^## ", content, flags=re.MULTILINE)
    assert len(entries) == 7
    for title in titles:
        assert title in content


def test_tc023_export_with_no_notes_returns_200_with_a_markdown_file_with_no_entries(
    client: TestClient,
) -> None:
    list_response = client.get("/notes")
    assert list_response.status_code == 200, list_response.text
    assert list_response.json() == []

    export_response = client.get("/notes/export")

    assert export_response.status_code == 200, export_response.text
    assert "markdown" in export_response.headers.get("content-type", "").lower()
    content = export_response.text
    entries = re.findall(r"^## ", content, flags=re.MULTILINE)
    assert entries == []
