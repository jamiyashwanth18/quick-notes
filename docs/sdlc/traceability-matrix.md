# Traceability Matrix

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start legend -->
Built from recorded links, not written by a model: requirement key → plan item (`source_stable_key`) → development ticket (`stable_key`) → the ticket's test steps → the last live deployment that started after the work finished. **AC tests** counts the story's acceptance criteria that have a test case, and those whose test cases all passed in the latest finished E2E run. **Tests** counts the tests written for the story, and **Result** how many last passed, how many failed and when, as of this page's generation; the Documentation tab shows them live.
<!-- sdlc:auto:end legend -->

<!-- sdlc:auto:start matrix -->
| Requirement | Epic | Title | Plan items | Sprint | Design | Code | Commits | Ticket | Test step | Tests | Result | AC tests | Deployed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| US-001 | EPIC-001 | Create a note with title and body | US-001 | 1 | POST /notes, api, db, notes, spa | backend/alembic/versions/0002_notes.py, backend/app/errors.py, backend/app/main.py, backend/app/models.py, backend/app/routers/__init__.py +8 more | f4b442e | delivered | succeeded | 0 | No tests | 0/4 tested · 0/4 passing | d85c5389665e |
| US-002 | EPIC-001 | View all notes newest first | US-002 | 1 | GET /notes, api, db, notes, spa | backend/app/main.py, backend/app/routers/notes.py, backend/tests/integration/test_notes.py, backend/tests/unit/test_notes_service.py, frontend/src/api/openapi.json +3 more | f255448 | delivered | succeeded | 0 | No tests | 0/2 tested · 0/2 passing | d85c5389665e |
| US-003 | EPIC-001 | Friendly empty state when there are no notes | US-003 | 1 | notes, spa | backend/tests/integration/test_us003_empty_state.py, frontend/src/screens/Notes.test.tsx | 165e7e9 | delivered | succeeded | 0 | No tests | 0/2 tested · 0/2 passing | d85c5389665e |
| US-004 | EPIC-002 | Delete a note after confirmation | US-004 | 2 | DELETE /notes/{id}, api, db, notes, spa | — | — | not started | not run | 0 | No tests | 0/4 tested · 0/4 passing | — |
| US-005 | EPIC-003 | Export all notes to a Markdown file | US-005 | 2 | GET /notes/export, api, db, notes, spa | — | — | not started | not run | 0 | No tests | 0/3 tested · 0/3 passing | — |
| US-006 | EPIC-003 | Cap exported notes to the configured limit | US-006 | 2 | GET /notes/export, api, db, notes, settings | — | — | not started | not run | 0 | No tests | 0/2 tested · 0/2 passing | — |
| US-007 | EPIC-003 | Edit the export-limit setting | US-007 | 2 | GET /settings, PUT /settings, api, db, settings, spa | — | — | not started | not run | 0 | No tests | 0/3 tested · 0/3 passing | — |
| US-008 | EPIC-004 | Use the app for free with no payment | US-008 | 2 | api, spa | — | — | not started | not run | 0 | No tests | 0/2 tested · 0/2 passing | — |
<!-- sdlc:auto:end matrix -->
