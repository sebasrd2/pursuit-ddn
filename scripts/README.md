# Scripts

Operational scripts for Pursuit. See `planning/pursuit-spec.md` §14.2. Run from anywhere —
each script resolves paths relative to the repo root, not your current directory.

| Script | Purpose |
|---|---|
| `dev.sh` | Runs the backend and frontend together with hot reload, for active development. |
| `start.sh` | Builds both and starts one production-style process in the background (PID file + log under `data/`), waiting for it to report healthy. |
| `stop.sh` | Stops the process started by `start.sh`, preserving data. |
| `restart.sh` | `stop.sh` then `start.sh`. |
| `logs.sh` | Follows the running process's log. |
| `ingest.sh` | Runs knowledge-base ingestion from the command line. |
| `reset-db.sh` | Deletes the database, after typed confirmation. |
| `backup.sh` | Archives `data/` into a timestamped `.tar.gz`. |
| `test.sh` | Runs backend and frontend unit tests. |

`build.sh` (container image) and `e2e.sh` are in the spec's full script list but depend on
containerization, deliberately deferred — see `planning/pursuit-spec.md` §14.1.
