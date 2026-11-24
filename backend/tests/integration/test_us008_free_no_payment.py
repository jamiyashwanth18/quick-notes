"""Integration tests for US-008: use the app for free with no payment.

AC-021 requires that creating, listing, deleting and exporting notes never asks the
caller for payment, billing details or a subscription. AC-022 requires that the app is
usable from any device with no sign-in, showing the same single shared global list of
notes to every caller. There is no sign-in for this app, so these tests use the plain
`client` fixture with no authentication header at all.
"""

from typing import Any

from fastapi.testclient import TestClient

_PAYMENT_STATUS_CODES = {402, 403}


def _notes_in(payload: Any) -> list[dict]:
    """The list of notes out of a GET /notes response, whatever envelope it uses."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("notes", "items", "results"):
            if isinstance(payload.get(key), list):
                return payload[key]
    raise AssertionError(f"GET /notes did not return a list of notes: {payload!r}")


def test_tc041_no_payment_or_subscription_barrier_on_any_note_action(
    client: TestClient,
) -> None:
    create_response = client.post(
        "/notes", json={"title": "Grocery list", "body": "Milk, eggs, bread"}
    )

    assert create_response.status_code == 201, create_response.text
    assert create_response.status_code not in _PAYMENT_STATUS_CODES
    created = create_response.json()
    note_id = created["id"]

    list_response = client.get("/notes")

    assert list_response.status_code == 200, list_response.text
    assert list_response.status_code not in _PAYMENT_STATUS_CODES
    notes = _notes_in(list_response.json())
    assert any(note.get("id") == note_id for note in notes)

    delete_response = client.delete(f"/notes/{note_id}")

    assert delete_response.status_code in (200, 204), delete_response.text
    assert delete_response.status_code not in _PAYMENT_STATUS_CODES

    after_delete_response = client.get("/notes")
    assert after_delete_response.status_code == 200, after_delete_response.text
    remaining_titles = [note.get("title") for note in _notes_in(after_delete_response.json())]
    assert "Grocery list" not in remaining_titles

    export_response = client.get("/notes/export")

    assert export_response.status_code == 200, export_response.text
    assert export_response.status_code not in _PAYMENT_STATUS_CODES


def test_tc043_same_shared_list_returned_to_two_unauthenticated_callers(
    client: TestClient,
) -> None:
    assert "Authorization" not in client.headers

    create_response = client.post(
        "/notes", json={"title": "Shared note test", "body": "Visible to everyone"}
    )

    assert create_response.status_code == 201, create_response.text

    device_a_response = client.get("/notes")

    assert device_a_response.status_code == 200, device_a_response.text
    device_a_notes = _notes_in(device_a_response.json())
    assert any(note.get("title") == "Shared note test" for note in device_a_notes)

    device_b_response = client.get("/notes")

    assert device_b_response.status_code == 200, device_b_response.text
    device_b_notes = _notes_in(device_b_response.json())
    assert device_b_notes == device_a_notes
    assert any(note.get("title") == "Shared note test" for note in device_b_notes)
