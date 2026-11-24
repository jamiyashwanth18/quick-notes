<!-- sdlc:auto:start adr -->
# ADR-0004: Use AWS for Cloud

Status: Accepted  
Date: 2026-11-24

## Context and Problem Statement

Which Cloud technology does the project use? Decided in architecture v1.

## Considered Options

- AWS
- Azure
- GCP

## Decision Outcome

Chosen option: AWS, because The approved stack. A static SPA host, one small container for the API, and a managed PostgreSQL instance give reliable low-cost hosting for a free, low-traffic app.

## Consequences

Managing three AWS services for a tiny app adds some ops overhead, but each is sized to the smallest tier.
<!-- sdlc:auto:end adr -->