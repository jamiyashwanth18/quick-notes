<!-- sdlc:auto:start adr -->
# ADR-0001: Use React 19 for Frontend

Status: Accepted  
Date: 2026-11-24

## Context and Problem Statement

Which Frontend technology does the project use? Decided in architecture v1.

## Considered Options

- React 19
- Vue
- Svelte

## Decision Outcome

Chosen option: React 19, because The approved stack. React 19 renders the few screens (list, create form, delete confirmation, settings, export button) and updates the list and prompts without a page reload (NFR-003). The export .md is produced from the API response via a Blob download in the browser.

## Consequences

A full SPA framework is more than a handful of static screens strictly need, but it is the platform default and keeps the no-reload behaviour simple.
<!-- sdlc:auto:end adr -->