<!-- sdlc:auto:start adr -->
# ADR-0003: Use PostgreSQL 16 for Database

Status: Accepted  
Date: 2026-11-24

## Context and Problem Statement

Which Database technology does the project use? Decided in architecture v1.

## Considered Options

- PostgreSQL 16
- SQLite
- MySQL

## Decision Outcome

Chosen option: PostgreSQL 16, because The approved stack. Notes are simple rows; 'newest first' and 'most recent N for export' are trivial ORDER BY created_at DESC / LIMIT queries, and the export limit is one settings row.

## Consequences

A managed relational DB is heavier than a file store, but it gives the single shared server-side list every visitor sees across devices (NFR-002).
<!-- sdlc:auto:end adr -->