# Product Requirements

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
## Summary

### REQ-STACK · approved · source: requirements:stack

Approved technology stack: FastAPI backend, PostgreSQL database, React frontend, hosted on AWS.

- Backend: FastAPI 0.115 — covers the small set of endpoints (create/list/delete note, assemble capped Markdown export) with little code; matches the two-sprint plan (create/list sprint 1, delete/export sprint 2). Platform default.
- Cloud: AWS — reliable, low-cost hosting for a free app with no heavy traffic; platform default; modest AWS footprint is enough.
- Database: PostgreSQL 16 — all visitors share one global store; notes are simple rows (title, body, created-at); 'newest first' and 'most recent N for export' are trivial ordered queries; export-limit setting is one more row.
- Frontend: React 19 — handles the list, create form, delete confirmation, settings area and export button; list and confirmation prompts update smoothly without a page reload.

**Related:** NFR-003

### REQ-SCOPE · approved · source: requirements:scope

Defines what Quick Notes version 1 includes and explicitly excludes.

Delivery scope: lightweight. Requirements version 1.
In scope: create a note with required title and body text; single shared list, newest first; friendly empty-state message; delete a note after confirmation; one global notepad shared by all visitors, same on every device; notes cannot be edited after creation; deletion is permanent with no trash/undo; free app with no payments or subscription.
Out of scope — not designed or built: search, tags/categories, editing notes, per-user accounts.

### REQ-FEAT-SHARED · approved · source: requirements:feature:shared-notepad

The app is one shared global notepad with no sign-in, fully free to use.

- One shared notepad for everyone: single global notepad, no sign-in; every visitor sees and works with the same shared list, identical on any device.
- Free with no payment: all features usable without paying, entering payment details, or subscribing; creating, listing, deleting and exporting never trigger a billing step.

### REQ-FEAT-LIST · approved · source: requirements:feature:note-list

Notes are shown in one shared list, newest first, with a friendly empty state.

- View notes newest first: all notes in one shared list, most recently created at the top; a note created by anyone appears at the top for every visitor on the next load.
- Friendly empty state: when there are no notes, a friendly empty-state message is shown instead of a blank list; once a note is created, the message is replaced by the list.

### REQ-FEAT-CREATE · approved · source: requirements:feature:creating-a-note

Visitors can create a note with a required title and limited-length body, with validation.

- Create a note: enter title and body text and submit; note is saved to the shared server-side store and appears in the list.
- Title and body validation: title required, max 100 characters; body max 2,000 characters; empty title blocks creation and shows a message that a title is required.

### REQ-FEAT-DELETE · approved · source: requirements:feature:deleting-a-note

Visitors can permanently delete a note after confirming, with no recovery option.

- Delete after confirmation: confirmation prompt shown first; confirming removes the note from the shared list for everyone; cancelling leaves it in place.
- Permanent deletion, no undo: confirmed deletion permanently removes the note; no trash, undo, or way to recover it.

### REQ-FEAT-EXPORT · approved · source: requirements:feature:exporting-notes

Visitors can export notes as a single, date-named, capped Markdown file.

- Export notes as Markdown: single .md file downloads directly in the browser, no email or cloud delivery.
- Date-based filename: filename derived from the current date.
- Nothing to export message: if no notes exist, visitor is told there is nothing to export; no empty file is downloaded.
- Cap to most recent notes: export includes at most the configured number of notes; most recent notes included up to the limit when more exist, all notes included when fewer exist.

### REQ-FEAT-SETTINGS · approved · source: requirements:feature:settings

Visitors can view and edit the export-limit setting.

- Edit the export limit: any visitor can open a settings area, see the current export limit (default 100), and set a new positive whole number; later exports use the new limit while keeping the most recent notes.

### NFR-001 · approved · source: requirements:NFR-001

Accepted risk: no sign-in means any visitor can read, delete, or change anything.

Category: security. No authentication of any kind; everyone shares one global list. Any visitor can read every note, permanently delete any note, and change the export-limit setting without restriction. This is a deliberate, accepted decision for this version.

### NFR-002 · approved · source: requirements:NFR-002

Accepted risk: notes are not separated or kept private between visitors.

Category: privacy. Notes are not private to their creator; there is no per-user or per-browser separation, so every note is visible to all visitors on every device. Accepted decision for this version.

### NFR-003 · approved · source: requirements:NFR-003

The note list and delete confirmation update smoothly without a full page reload.

Category: usability. The note list and the delete confirmation prompt update in the browser without forcing a full page reload, matching what visitors expect from a notepad.
<!-- sdlc:auto:end narrative -->

<!-- sdlc:auto:start summary -->
**Requirements version:** v1  
**Delivery scope:** lightweight  
**Approved:** 2026-11-24

**Capabilities in scope:** Create a note with required title and body text, Single shared list of all notes, newest first, Friendly empty-state message when there are no notes, Delete a note after a confirmation prompt, One global notepad shared by all visitors, same on every device, Notes cannot be edited after they are created, Deletion is permanent, with no trash or undo, Free app with no payments or subscription

**Approved technology stack:**

| Layer | Choice | Rationale |
|---|---|---|
| backend | FastAPI | The server's whole job is small: save a note, return the list newest-first, delete one note, and assemble the Markdown export capped at the configured number. FastAPI covers these few endpoints with very little code and is the platform default, so it matches the two-sprint plan well -- create/list in sprint 1, delete/export in sprint 2. |
| cloud | AWS | A single small web app with one database needs reliable, low-cost hosting that can stay up for anyone visiting, and AWS is the platform default that covers this without any special requirement from you. The app is free with no payments and no heavy traffic described, so a modest AWS footprint is enough. |
| database | PostgreSQL | Because every visitor shares one global note list across devices, the notes must live in one server-side store, and the analyst already assumed a relational database. PostgreSQL fits exactly: notes are simple rows (title, body, created-at) and 'newest first' plus the 'most recent N for export' are trivial ordered queries. The export-limit setting is one more small row. |
| frontend | React | Quick Notes is a small browser app with a handful of screens -- a note list, a create form, a delete confirmation, a settings area and an export button. React handles all of that comfortably and is the platform default, so there is no reason to look elsewhere. The confirmation prompts and the live note list update smoothly without a page reload, which is what visitors expect from a notepad. |
<!-- sdlc:auto:end summary -->

<!-- sdlc:auto:start epics -->
## EPIC-001: Create and List Notes

Sprint 1. Any visitor can create a short note and see all notes in a single shared, newest-first list with a friendly empty state. There is no sign-in and no per-user or per-browser separation: every visitor sees and edits the same global list.

Assumption: Notes are stored server-side in a shared relational database (e.g. PostgreSQL) so all visitors see the same list across devices. Assumption: Notes cannot be edited after creation; the only supported operations are create, list, delete and export. Assumption: There is no sign-in or user authentication of any kind.

### US-001: Create a note with title and body

**Priority:** critical

> As a visitor, I want to create a note with a required title and body text, so that I can quickly capture a short note that everyone can see.

| ID | Given | When | Then |
|---|---|---|---|
| AC-001 | I am on the note creation form | I enter a title of 1 to 100 characters and body text of up to 2,000 characters and submit | the note is saved to the shared server-side store and appears in the list |
| AC-002 | I am on the note creation form | I leave the title empty and submit | the note is not created and I see a validation message that a title is required |
| AC-003 | I am entering a title | I attempt to enter more than 100 characters | the title is limited to 100 characters and I cannot save a longer title |
| AC-004 | I am entering body text | I attempt to enter more than 2,000 characters | the body is limited to 2,000 characters and I cannot save a longer body |

### US-002: View all notes newest first

**Priority:** critical

> As a visitor, I want to see all notes in one shared list ordered newest first, so that I can read the most recent notes immediately.

| ID | Given | When | Then |
|---|---|---|---|
| AC-005 | one or more notes exist in the shared store | I open the app | I see all notes in a single list with the most recently created note at the top |
| AC-006 | a note has just been created by any visitor | the shared list is loaded | that note appears at the top of the list for every visitor regardless of device |

### US-003: Friendly empty state when there are no notes

**Priority:** medium

> As a visitor, I want to see a clear message when there are no notes, so that I understand the list is empty rather than broken.

| ID | Given | When | Then |
|---|---|---|---|
| AC-007 | the shared store contains no notes | I open the app | I see a friendly empty-state message instead of an empty list |
| AC-008 | the empty-state message is shown | a note is created | the empty-state message is replaced by the list containing that note |

## EPIC-002: Delete Notes

Sprint 2. Any visitor can permanently delete a note from the shared list after confirming the action.

Assumption: Deletion is permanent and removes the note from the shared store, with no soft-delete, trash or undo. Because there is no sign-in, any visitor can delete any note.

### US-004: Delete a note after confirmation

**Priority:** high

> As a visitor, I want to delete a note after confirming the action, so that I can remove notes that are no longer needed.

| ID | Given | When | Then |
|---|---|---|---|
| AC-009 | a note exists in the list | I choose to delete it | I am shown a confirmation prompt before anything is removed |
| AC-010 | the delete confirmation prompt is shown | I confirm the deletion | the note is permanently removed from the shared store and no longer appears in the list for any visitor |
| AC-011 | the delete confirmation prompt is shown | I cancel | the note is not deleted and remains in the list |
| AC-012 | a note has been deleted | I look for it | it cannot be recovered because there is no trash or undo |

## EPIC-003: Export Notes as Markdown

Sprint 2. Any visitor can export the notes as a single Markdown (.md) file downloaded to their device, with the filename derived from the current date. The number of notes exported is capped by a configurable setting (default 100), exporting the most recent notes when more exist.

Assumption: The export produces one .md file downloaded directly in the browser, with no email or cloud delivery. Assumption: The export-count limit setting is editable by any visitor via a settings area (there is no sign-in to restrict it), and the cap keeps the most recent N notes.

### US-005: Export all notes to a Markdown file

**Priority:** high

> As a visitor, I want to export the notes as one Markdown file downloaded to my device, so that I can keep an offline copy of the notes.

| ID | Given | When | Then |
|---|---|---|---|
| AC-013 | one or more notes exist | I choose to export | a single Markdown (.md) file is downloaded to my device in the browser, with no email or cloud delivery |
| AC-014 | I trigger an export | the file is generated | its filename is derived from the current date |
| AC-015 | there are no notes | I choose to export | I am informed there is nothing to export and no empty file is forced on me |

### US-006: Cap exported notes to the configured limit

**Priority:** medium

> As a visitor, I want the export to include at most the configured number of notes, so that exports stay a manageable size and include the most relevant notes.

| ID | Given | When | Then |
|---|---|---|---|
| AC-016 | the export limit setting is at its default of 100 | there are more than 100 notes and I export | only the 100 most recent notes are included in the file |
| AC-017 | there are fewer notes than the export limit | I export | all existing notes are included in the file |

### US-007: Edit the export-limit setting

**Priority:** low

> As a visitor, I want to change the maximum number of notes included in an export, so that I can control how many notes are exported.

| ID | Given | When | Then |
|---|---|---|---|
| AC-018 | I open the settings area | I view the export limit | I see its current value, which defaults to 100 |
| AC-019 | I am in the settings area | I set the export limit to a new positive whole number and save | subsequent exports use the new limit, keeping the most recent N notes |
| AC-020 | there is no sign-in | any visitor opens the settings area | that visitor can view and change the export-limit setting without authentication |

## EPIC-004: Free Shared Notepad

The app is a single global notepad shared by all visitors and is free to use.

Assumption: The app is free with no payments, billing or subscription of any kind. Assumption: Search, tags/categories, editing notes and per-user accounts are out of scope for this version.

### US-008: Use the app for free with no payment

**Priority:** medium

> As a visitor, I want to use all features without paying or subscribing, so that I can take notes without any cost or billing step.

| ID | Given | When | Then |
|---|---|---|---|
| AC-021 | I am using the app | I create, list, delete or export notes | I am never asked to pay, enter payment details or subscribe |
| AC-022 | I use the app from any device | I open it | I see the same single shared global list of notes with no sign-in required |
<!-- sdlc:auto:end epics -->
