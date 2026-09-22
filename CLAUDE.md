# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repository is currently pre-implementation. It contains only the folder scaffold
(`frontend/`, `backend/`, `config/`, `docs/`, `deploy/`, `scripts/`, `e2e/`, `knowledge/` —
all empty) and the full specification at `planning/pursuit-spec.md`. There is no code, build
system, package manager, or test suite yet — nothing to build, lint, or run. Update this file
with real commands once implementation begins.

## What Pursuit is

Pursuit is an internal DDN web app that turns an inbound RFP spreadsheet into a submitted
response: import questions from Excel, score bid/no-bid against configurable criteria,
auto-answer questions from a knowledge base (only when certain), let a Sales Engineer
review/correct, and export back into the original workbook.

`planning/pursuit-spec.md` is the authoritative source — read it before implementing
anything. This file only summarizes the decisions that shape how code should be structured.

## Architecture (spec §11–§12)

- One application, two parts kept in separate top-level folders for independent
  development — `frontend/` (SPA, builds to static files) and `backend/` (API service) — but
  deployed as **one container, one process, one port** for v1. No queue, no separate worker,
  no service split.
- Single embedded database file holds RFPs, questions, config, scoping results, and the
  knowledge passage embeddings (the search index lives in the same DB, no separate vector
  store).
- `data/` (gitignored) is the file store — uploads, exports, cached models — mounted as a
  volume in deployment.
- `knowledge/` (gitignored except `README.md` and `sources.yaml`) holds DDN source material
  ingested into the knowledge base; `config/` holds editable non-code seeds (bid criteria,
  thresholds, owner teams, allowed documentation domains, provider defaults).
- The AI provider (text generation and embeddings, configured independently) is reached
  through one internal interface so swapping providers needs no change elsewhere — v1
  implements OpenRouter plus a `stub` for tests.
- Scoping and auto-answering run synchronously inside the request — no background jobs;
  question sets and the knowledge base are small enough for v1.

## Rules that shape implementation

- **Confidence rule (central to the whole system):** an answer is written only when
  generation returns high confidence and is backed by the knowledge base or an allow-listed
  DDN domain. Otherwise the answer stays empty, status becomes `needs_input`, and a gap note
  is recorded — never guess, infer, or produce a partial answer (spec §3.4).
- Every accepted answer carries a citation (plain text or link) as a single free-text field,
  not a structured record.
- Bid/no-bid criteria and scoring are pure configuration (`config/`), not code — see spec §4
  for the scoring formula and threshold bands.
- Export must write answers into column C of the **original uploaded workbook**, preserving
  row order and categories (spec §3.6).
- No auth, no notifications, no CRM integration, no real-time collaboration in v1 (spec
  §1.2).

## Testing approach (spec §15)

Tests are built incrementally alongside the app, not as an upfront checklist — start with the
highest-risk logic (import parsing, the confidence rule, scoring, export round-trip). No
automated test may call a live AI provider or the internet; all tests use the `stub` provider
and a stubbed web lookup.
