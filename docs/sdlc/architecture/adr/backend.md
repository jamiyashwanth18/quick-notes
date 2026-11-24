<!-- sdlc:auto:start adr -->
# ADR-0002: Use FastAPI 0.115 for Backend

Status: Accepted  
Date: 2026-11-24

## Context and Problem Statement

Which Backend technology does the project use? Decided in architecture v1.

## Considered Options

- FastAPI 0.115
- Flask
- Express

## Decision Outcome

Chosen option: FastAPI 0.115, because The approved stack. Its Pydantic validation enforces the title (1-100) and body (<=2,000) rules declaratively, and the six small endpoints map cleanly to the two-sprint plan.

## Consequences

Minimal: FastAPI is well-suited to this small surface; the async machinery is more than the workload demands but costs nothing here.
<!-- sdlc:auto:end adr -->