"""Integration tests for the export-limit setting (US-007).

GET /settings returns the current export-limit setting, defaulting to 100; PUT
/settings changes it to a positive whole number. There is no sign-in for this app, so
these tests use the plain `client` fixture, with no Authorization header sent.
"""

import re

from fastapi.testclient import TestClient


def test_tc030_default_export_limit_is_100(client: TestClient) -> None:
    response = client.get("/settings")

    assert response.status_code == 200, response.text
    assert response.json()["exportLimit"] == 100


def test_tc032_export_uses_newly_saved_limit_and_keeps_most_recent_notes(
    client: TestClient,
) -> None:
    update_response = client.put("/settings", json={"exportLimit": 3})
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["exportLimit"] == 3

    for title, body in [
        ("Note A", "First note"),
        ("Note B", "Second note"),
        ("Note C", "Third note"),
        ("Note D", "Fourth note"),
        ("Note E", "Fifth note"),
    ]:
        create_response = client.post("/notes", json={"title": title, "body": body})
        assert create_response.status_code == 201, create_response.text

    export_response = client.get("/notes/export")

    assert export_response.status_code == 200, export_response.text
    content = export_response.text
    entries = re.findall(r"^## (Note [A-E])$", content, flags=re.MULTILINE)
    assert entries == ["Note E", "Note D", "Note C"]


def test_tc033_reject_zero_as_export_limit(client: TestClient) -> None:
    before_response = client.get("/settings")
    assert before_response.status_code == 200, before_response.text
    previous_limit = before_response.json()["exportLimit"]

    response = client.put("/settings", json={"exportLimit": 0})

    assert response.status_code == 422, response.text

    after_response = client.get("/settings")
    assert after_response.status_code == 200, after_response.text
    assert after_response.json()["exportLimit"] == previous_limit


def test_tc034_reject_non_numeric_export_limit(client: TestClient) -> None:
    before_response = client.get("/settings")
    assert before_response.status_code == 200, before_response.text
    previous_limit = before_response.json()["exportLimit"]

    response = client.put("/settings", json={"exportLimit": "abc"})

    assert response.status_code == 422, response.text

    after_response = client.get("/settings")
    assert after_response.status_code == 200, after_response.text
    assert after_response.json()["exportLimit"] == previous_limit


def test_tc035_reject_a_fractional_export_limit(client: TestClient) -> None:
    before_response = client.get("/settings")
    assert before_response.status_code == 200, before_response.text
    previous_limit = before_response.json()["exportLimit"]

    response = client.put("/settings", json={"exportLimit": 2.5})

    assert response.status_code == 422, response.text

    after_response = client.get("/settings")
    assert after_response.status_code == 200, after_response.text
    assert after_response.json()["exportLimit"] == previous_limit


def test_tc038_view_export_limit_without_authentication(client: TestClient) -> None:
    assert "Authorization" not in client.headers

    response = client.get("/settings")

    assert response.status_code == 200, response.text
    assert "exportLimit" in response.json()


def test_tc039_change_export_limit_without_authentication(client: TestClient) -> None:
    assert "Authorization" not in client.headers

    response = client.put("/settings", json={"exportLimit": 5})

    assert response.status_code == 200, response.text
    assert response.json()["exportLimit"] == 5
