# Sprint Plan

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start sprints -->
## Sprint 1: Sprint 1

Visitors can create notes and see the shared list newest-first, with a friendly empty state.

Capacity: 20 points · Committed: 10

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-001 | Story | Create a note with title and body | 5 | backend-agent | — |
| US-002 | Story | View all notes newest first | 3 | backend-agent | US-001 |
| US-003 | Story | Friendly empty state when there are no notes | 2 | frontend-agent | US-002 |

## Sprint 2: Sprint 2

Visitors can delete notes after confirmation and export notes to a date-named Markdown file capped by an editable settings value, with no payment step anywhere.

Capacity: 20 points · Committed: 19

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-004 | Story | Delete a note after confirmation | 5 | backend-agent | US-002 |
| US-005 | Story | Export all notes to a Markdown file | 5 | backend-agent | US-002 |
| US-006 | Story | Cap exported notes to the configured limit | 3 | backend-agent | US-005 |
| US-007 | Story | Edit the export-limit setting | 5 | backend-agent | US-006 |
| US-008 | Story | Use the app for free with no payment | 1 | qa-agent | — |

## Unscheduled

_Nothing unscheduled._
<!-- sdlc:auto:end sprints -->
