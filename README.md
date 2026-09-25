# Pursuit

RFP response system for DDN Sales Engineering. See `planning/pursuit-spec.md` for the full
specification.

## Structure

See `planning/pursuit-spec.md` §12 for the folder layout.

## Quickstart

1. `cp .env.example .env` and fill in `PURSUIT_LLM_API_KEY` (an OpenRouter key — see §7 of
   the spec). Everything else has a working default.
2. `cd backend && npm install && cd ../frontend && npm install && cd ..`
3. `bash scripts/dev.sh` — runs the API and web client together with hot reload at
   `http://localhost:5173` (proxying `/api` to the backend).

For a production-style single-process run instead: `bash scripts/start.sh` (builds both,
serves everything from `http://127.0.0.1:8080`), `bash scripts/stop.sh` to stop it, and
`bash scripts/logs.sh` to follow its log. See `scripts/` for the rest (`ingest.sh`,
`reset-db.sh`, `backup.sh`, `test.sh`) and `planning/pursuit-spec.md` §14.2 for what each
one does.
