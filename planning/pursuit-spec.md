# Pursuit — RFP Response System

**System Description and Requirements**
Version 1.0 · DDN Sales Engineering

---

## 1. Overview

Pursuit is an internal web application that shortens the time DDN spends turning an inbound
RFP/RFI/RFQ into a submitted response.

A Sales Engineer (SE) uploads the customer's question spreadsheet. Pursuit scopes the
opportunity against a knowledge base of DDN material and produces a bid / no-bid
recommendation against a configurable set of criteria. If the SE decides to bid, Pursuit
attempts to answer every question automatically. The SE and other teams then review the
answers, correct them, and write the ones Pursuit left empty. The finished set is exported
in the original spreadsheet.

### 1.1 Goals

| # | Goal |
|---|------|
| G1 | Import an RFP question set from Excel |
| G2 | Produce a bid/no-bid recommendation against stated, configurable criteria |
| G3 | Answer questions automatically, when the answer is certain |
| G4 | Make review and editing fast — the SE corrects rather than writes |
| G5 | Route questions the SE cannot answer to the right team |
| G6 | Export a clean deliverable |

### 1.2 Non-goals for v1

- No authentication, user accounts or permissions.
- No notifications. The owner field is a label, not a workflow trigger.
- No audio/video transcription. Transcripts are supplied as text files.
- No PDF or Word parsing of the RFP itself. Questions arrive as Excel.
- No CRM integration, no branded proposal assembly.
- No real-time collaboration. One user at a time.

### 1.3 Users

| User | Role |
|---|---|
| **Sales Engineer (SE)** | Primary user and default owner of every question |
| **Contributing teams** | Legal, Security & Compliance, HR, Operations, Finance, Product Management, Engineering, Support & Services, Marketing, Executive |

---

## 2. Stages and progress

Every RFP moves through six stages.

| # | Stage | What happens | Complete when |
|---|---|---|---|
| 1 | **Import** | The question spreadsheet is uploaded and questions are created | Questions exist |
| 2 | **Scoping** | Pursuit assesses the RFP against the bid criteria | A scoping result exists |
| 3 | **Decision** | The user records bid or no-bid | A decision is recorded |
| 4 | **Auto-answer** | Pursuit attempts to answer every question automatically | Every question has been attempted |
| 5 | **Review** | The user checks each generated answer and writes the answers Pursuit left empty | No question is `ai_answered` or `needs_input` |
| 6 | **Export** | The completed set is downloaded and the RFP is marked complete | The RFP status is `complete` |

A `no_bid` decision ends the flow at stage 3. Stages 4 to 6 are not entered.

### 2.1 Progress stepper component

A simple, read-only stepper showing where the RFP is:

- All six stages in order, left to right, each with its number and name.
- Completed stages are marked as done; the current stage is highlighted; later stages are
  shown as upcoming.
- The stepper is not interactive.
- It appears on the RFP overview screen and in the header of the questions screen.
- The current stage is derived from RFP and question data.

---

## 3. Functional requirements

### 3.1 Create an RFP and import questions

1. The user creates an RFP with: name, customer, due date, optional notes.
2. The user uploads an `.xlsx` file.
3. The file has a **fixed structure**. The first worksheet is used, the first row is a
   header and is skipped, and the columns are:

   | Column | Content |
   |---|---|
   | A | Category |
   | B | Question |
   | C | Answer |

4. Questions are created in row order. Rows with an empty Question cell are ignored.
5. Category values become the question categories, in first-appearance order. Rows with an
   empty Category cell are placed in a category named **General**. If no row has a
   category, every question is placed in General.
6. Any text already present in column C is imported as the question's existing answer.
7. Pursuit shows an import summary — number of questions and categories — when the import
   completes.
8. The uploaded file is retained so the export can write answers back into it.
9. The user can add, edit or delete questions manually after import.

### 3.2 Question categories

- Questions are always displayed grouped by category.
- Categories come from column A only. Pursuit does not infer or invent categories.
- Each category group displays its own completion count.

### 3.3 Scoping and the bid / no-bid decision

1. The user starts a scoping run.
2. Pursuit assesses the RFP against each enabled criterion (§4) using the knowledge base.
3. For each criterion the result records: the criterion name and description, the
   assessment, the importance applied, the supporting evidence, and a short statement of
   reasoning.
4. The result also records the overall score, whether the disqualifier was triggered, the
   thresholds in force, and the recommendation.
5. **The criteria and thresholds are displayed alongside the result**, so the
   recommendation always reads as "these are the rules, this is how this RFP scored".
6. Where there is no evidence for a criterion, it is reported as **Not assessed** and
   excluded from the score. Pursuit does not score a criterion on assumption.
7. Re-running is permitted. Only the latest scoping result is kept — re-running replaces
   it.
8. The user records the decision — `bid` or `no_bid` — with an optional rationale. The
   decision belongs to the user; the recommendation is advisory.
9. `no_bid` closes the RFP and hides the answering workspace. The record and the scoping
   result are retained.
10. `bid` unlocks the answering workspace.

### 3.4 Stage 4 — automatic answering

**Confidence rule — the central requirement of this system**

> Pursuit writes an answer only when it is certain of it. In every other case the answer
> field is left **empty**. Pursuit does not guess, infer, extrapolate, or produce a partial
> answer as a starting point.

**Sources**

An answer may be based on either:

- the **knowledge base** (§6), or
- **official DDN documentation on the internet**, restricted to a configurable list of
  allowed domains.

No other source is permitted. Every accepted answer carries a **citation**: one line of
plain text naming the source (document and section), or a link when the source is a web
page. This is a single free-text field, not a structured record — whatever source supported
the answer already identifies itself, so filling this in adds no extra lookup or logic.

**Behaviour**

- The generation step returns a confidence assessment. Only high confidence is accepted.
- When confidence is not high, or no supporting content is found:
  - the answer field remains empty
  - the question's status is set to `needs_input`
  - a **gap note** records what information would be required to answer it
  - a suggested owner team is set where the question's subject clearly belongs to another
    team; otherwise the owner remains Sales Engineer
- Pursuit must never state a capacity, throughput, latency, certification, price, roadmap
  date or product capability that does not appear in a supporting source.

**Entry points**

- **Answer all** — processes every unanswered question in one run and returns when it's
  done. Typical question sets are tens of questions, not hundreds, so this runs as a single
  request; no background job, live progress or cancellation is needed for v1.
- **Answer this one** — a per-question action, with an optional instruction (for example
  "shorter", "answer as yes/no with one sentence").

**Output per question**

| Field | Description |
|---|---|
| Answer | Text, or empty |
| Citation | Plain text or a link naming the source; present whenever the answer is |
| Gap note | Present only when the answer is empty |
| Suggested owner team | Pre-fills the owner dropdown; always overridable |

### 3.5 Stage 5 — review

The questions workspace is the primary screen. The user works through two kinds of
question: generated answers that must be checked and corrected, and empty answers that must
be written.

The screen must support:

- Questions grouped by category, with per-category completion counts.
- Inline editing of any answer, with automatic saving.
- An **Owner** dropdown on every question, defaulting to Sales Engineer, listing the
  configured teams. An optional free-text field records a specific person's name.
- A **Status** dropdown on every question (§5.2).
- Filtering by status, owner and category, and free-text search across question text.
- Bulk assignment of owner or status to selected questions.
- The citation shown next to its answer, as plain text or a link.
- A clearly marked view of the questions with empty answers and their gap notes, so the SE
  can see immediately what needs to be written and who it belongs to.
- A completion summary in the header, for example `132 approved · 31 to check · 17 need input`.

### 3.6 Stage 6 — export

The user downloads the RFP as an `.xlsx` file: **the original uploaded workbook with the
answers written into column C**. The original categories, questions and row order are
preserved.

Options:

- Include only `approved` questions, or include all. Default: all.
- Optionally append `Owner`, `Status` and `Citation` as columns D, E and F.

Questions with empty answers are exported with column C blank.

---

## 4. Bid / no-bid criteria

Criteria are configuration, not code. They are seeded from a configuration file and edited
in the settings screen. Every configuration field is a dropdown — there are no free-text or
numeric inputs.

### 4.1 Criteria

| Criterion | Assesses |
|---|---|
| **Product fit** | Whether DDN's portfolio addresses the requirements |
| **Technical feasibility** | Whether the requirements are achievable with current products |
| **Requirements coverage** | How much of the question set can be answered from known material |
| **Effort vs. opportunity** | The response effort relative to the opportunity |
| **Mandatory disqualifier** | Whether the RFP states a requirement DDN cannot meet at all |

### 4.2 Configuration

Per criterion, two dropdowns:

| Setting | Options |
|---|---|
| **Enabled** | Yes · No |
| **Importance** | Low · Medium · High |

The disqualifier has only the Enabled setting; it does not carry importance.

One dropdown applies to the whole assessment:

| Setting | Options | Meaning |
|---|---|---|
| **Threshold** | Conservative · Balanced · Aggressive | How high the score must be to recommend a bid |

### 4.3 Scoring

Each criterion is assessed on a fixed three-point scale, plus an excluded value:

| Assessment | Points |
|---|---|
| Strong | 2 |
| Partial | 1 |
| Weak | 0 |
| Not assessed | excluded from the calculation |

Importance sets the multiplier: Low = 1, Medium = 2, High = 3.

```
score = ( Σ points × importance ) / ( Σ 2 × importance ) × 100
```

summed over assessed, enabled criteria only.

The disqualifier is assessed as **Triggered** or **Not triggered**. When triggered, the
recommendation is `no_bid` regardless of the score.

Thresholds:

| Threshold | Bid | Conditional | No-bid |
|---|---|---|---|
| Conservative | ≥ 80 | 60 – 79 | < 60 |
| Balanced | ≥ 65 | 45 – 64 | < 45 |
| Aggressive | ≥ 50 | 35 – 49 | < 35 |

The result screen displays the scale, the importance applied to each criterion, the active
threshold and its bands, so the number is always traceable.

---

## 5. Status models

### 5.1 RFP status

A user-editable dropdown. Pursuit advances it automatically at the points below but never
prevents the user from setting any value.

| Status | Meaning | Set automatically |
|---|---|---|
| `draft` | Created, questions not yet imported | On creation |
| `scoping` | Scoping started, no decision yet | When a scoping run starts |
| `no_bid` | Decided not to respond. Terminal | When the decision is `no_bid` |
| `in_progress` | Bidding, answers being produced | When the decision is `bid` |
| `in_review` | Every question has been attempted | When no question is `unanswered` |
| `complete` | Finished | Never — user only |

### 5.2 Question status

| Status | Meaning |
|---|---|
| `unanswered` | Not yet attempted |
| `needs_input` | Attempted, but no certain answer was possible. Answer empty, gap note present |
| `ai_answered` | Pursuit produced an answer, not yet checked by a human |
| `in_review` | A human has edited it or assigned it to an owner team |
| `approved` | Final |
| `not_applicable` | Deliberately not answered |

### 5.3 Owner teams

A configurable list, seeded with: **Sales Engineer (SE)** (default), Legal, Security &
Compliance, HR / People, Operations, Finance, Product Management, Engineering, Support &
Services, Marketing, Executive, Other. Teams can be added, renamed and deactivated in
settings.

---

## 6. Knowledge base

### 6.1 Sources

DDN material is supplied as files in a knowledge folder and as URLs in a source list.

```
knowledge/
├── README.md         how to add material
├── sources.yaml      web pages to fetch
├── datasheets/       fact sheets, product briefs
├── documentation/    product documentation
├── presentations/    decks
├── past-rfps/        previous RFP responses
├── transcripts/      webinar and video transcripts as text
└── notes/            written notes and positioning
```

Supported formats: `.pdf`, `.docx`, `.pptx`, `.md`, `.txt`, plus web pages listed in
`sources.yaml`. These cover the knowledge folder's contents at launch; other formats
(`.xlsx`, `.csv`, `.html`, `.vtt`, `.srt`, ...) can be added later if real material of that
type needs ingesting.

### 6.2 Ingestion requirements

- Ingestion is triggered from the command line or from the application's knowledge screen.
- Text is extracted from each source, split into passages, indexed for semantic retrieval,
  and stored with its document title and section heading.
- Ingestion is incremental: unchanged sources are skipped.
- Question-and-answer pairs found in past RFP files are indexed as single units.
- Video and audio are not transcribed. Transcripts are supplied as text files.
- The knowledge screen lists every indexed document with its type, passage count and
  ingestion date, and allows a document to be removed or re-indexed.

### 6.3 Retrieval requirements

- Retrieval uses semantic similarity (embeddings). Keyword matching can be added later if
  semantic search alone doesn't return good results for real questions.
- Every retrieved passage is identified by its document title and section heading.
- A retrieval preview is available so a user can see which passages a given question
  returns, without generating an answer.

### 6.4 Web lookup

- When the knowledge base does not support an answer, Pursuit may consult official DDN
  documentation on the internet.
- Lookup is restricted to a configurable allow-list of domains. Requests to any other
  domain are refused.
- Retrieved page content is treated exactly like knowledge-base content: it must support
  the answer directly. Its page title and URL become the answer's citation.
- Web lookup can be disabled entirely by configuration.

---

## 7. AI provider configuration

The AI provider is reached through one internal interface, so changing provider requires no
code change elsewhere in the application.

- Provider, model and credentials are read from environment variables supplied through an
  `.env` file (§13).
- v1 implements one real provider, **OpenRouter** (an OpenAI-compatible API that gives
  access to many models through a single key), plus `stub` for tests. Other providers can
  be added later behind the same interface if needed.
- v1's default text-generation model is `dots-studio/dots-3-note-preview:free`, OpenRouter's
  free tier — chosen to keep v1 running at no per-token cost. It carries OpenRouter's usual
  free-tier rate limits, which `PURSUIT_LLM_DELAY_MS` and `PURSUIT_LLM_MAX_RETRIES` are tuned
  around; moving to a paid model later needs only an `.env` change (§13).
- The text-generation provider and the embedding provider are configured independently.
  v1's embedding provider is a local model by default.
- The active provider and model are shown on the settings screen and returned by the health
  endpoint.
- Requests are rate-limited and retried with backoff according to configuration.
- Generated answers are cached, so re-running generation does not repeat identical calls.
- If the provider becomes unavailable or a quota is exhausted mid-run, questions already
  answered keep their answers; the user retries to continue with the rest.

---

## 8. Data model

Logical entities and their significant attributes.

| Entity | Attributes |
|---|---|
| **RFP** | id, name, customer, due date, status, bid decision, bid rationale, source file reference, notes, timestamps |
| **Category** | id, rfp, name, display order |
| **Question** | id, rfp, category, row number, question text, answer text, citation (text or link), answer source (ai / human / mixed), status, gap note, owner team, owner name, notes, timestamps |
| **Owner team** | id, name, is default, display order, active |
| **Bid criterion** | id, name, description, enabled, importance |
| **Scoping settings** | threshold |
| **Scoping run** | id, rfp, criteria snapshot, per-criterion assessment with evidence, disqualifier result, overall score, recommendation, timestamp — one per RFP; re-running replaces it |
| **Knowledge document** | id, title, source type, location, content hash, tags, passage count, ingested at, error |
| **Knowledge passage** | id, document, ordinal, heading, text, kind, vector |

---

## 9. Interface

All endpoints are served under `/api`.

**RFPs**
```
GET    /api/rfps                     list
POST   /api/rfps                     create with spreadsheet upload; imports questions
GET    /api/rfps/{id}                detail, including current stage and counts
PATCH  /api/rfps/{id}                status, decision, rationale, metadata
DELETE /api/rfps/{id}
POST   /api/rfps/{id}/scope          start a scoping run
GET    /api/rfps/{id}/scope          latest scoping result
POST   /api/rfps/{id}/answer         start automatic answering
GET    /api/rfps/{id}/export         round-trip workbook
```

**Questions**
```
GET    /api/rfps/{id}/questions      grouped by category, with filters
POST   /api/rfps/{id}/questions      add manually
PATCH  /api/questions/{id}
PATCH  /api/questions/bulk
DELETE /api/questions/{id}
POST   /api/questions/{id}/answer    answer a single question
```

**Knowledge**
```
GET    /api/knowledge/documents
POST   /api/knowledge/ingest
DELETE /api/knowledge/documents/{id}
GET    /api/knowledge/search         retrieval preview
```

**Configuration**
```
GET    /api/owner-teams              plus POST, PATCH, DELETE
GET    /api/bid-criteria             plus PATCH for enabled and importance
GET    /api/scoping-settings         plus PATCH for threshold
GET    /api/health                   version, active provider, knowledge counts
```

---

## 10. User interface

### 10.1 Screens

| Route | Screen | Contents |
|---|---|---|
| `/` | RFP list | Name, customer, due date, status, current stage, decision |
| `/rfps/new` | Create | Metadata form and file upload |
| `/rfps/:id` | Overview | Metadata, progress stepper, status control, scoping result with criteria and thresholds, decision control, export |
| `/rfps/:id/questions` | Questions workspace | Category-grouped question list, filters, detail panel, progress stepper in the header |
| `/knowledge` | Knowledge | Document list, re-index action, retrieval preview |
| `/settings` | Settings | Active AI provider and model, bid criteria dropdowns, threshold dropdown, owner team editor |

### 10.2 Questions workspace

- Left: questions grouped by category, each group collapsible with its own completion
  count. Each row shows the question text, owner, status, and an indicator when the answer
  is empty.
- Right: a detail panel with the full question, the answer editor, owner and status
  controls, a regenerate action with an optional instruction, the citation (plain text or a
  link), and the gap note when the answer is empty.

### 10.3 Branding

The application follows the DDN visual identity: near-black surfaces, warm neutral
backgrounds and borders, a single red accent, pill-shaped buttons, and tight, heavy
headings.

```css
:root {
  --ddn-ink:          #1A1B1D;   /* primary dark surface and headings */
  --ddn-ink-deep:     #000000;
  --ddn-ink-soft:     rgba(26, 27, 29, 0.80);   /* body text */
  --ddn-ink-muted:    rgba(26, 27, 29, 0.55);   /* secondary text */
  --ddn-surface:      #FFFFFF;
  --ddn-surface-warm: #FFFCF9;   /* page background */
  --ddn-surface-alt:  #F3F3F3;
  --ddn-line:         #D8D2CB;   /* borders */
  --ddn-red:          #CB343B;   /* accent */
  --ddn-red-bright:   #ED2738;
  --ddn-success:      #2E6F4E;
  --ddn-warning:      #B07A1E;
  --ddn-font:         "articulat-cf", "Archivo", -apple-system, "Segoe UI", sans-serif;
  --ddn-radius-pill:  100px;
  --ddn-radius-card:  12px;
}
```

- Typeface: Articulat CF where a licence is available; Archivo as the free fallback. The
  application must render correctly with the fallback alone.
- Headings: weight 700, letter-spacing −0.03em, line-height 0.98.
- Body text: 16px, line-height 1.5.
- Primary buttons: dark fill, white text, pill radius, weight 600.
- The red accent is reserved for emphasis and destructive actions.
- All text and background pairings meet WCAG AA contrast.

---

## 11. Architecture

### 11.1 Components

Pursuit is one application in two parts, kept in separate folders (§12) so the frontend and
backend can be worked on independently — but for v1 it runs as a single simple service, with
no queue, no separate worker process, and no storage abstraction beyond an ordinary
data-access layer.

| Component | Responsibility |
|---|---|
| **Web client** (`frontend/`) | Single-page application. All user interaction. Builds to static files. |
| **API service** (`backend/`) | Request handling, validation, business rules, stage derivation, scoping, automatic answering, knowledge ingestion and retrieval, export. Scoping a bid and answering a question set run synchronously within the request — v1's question sets and knowledge base are small enough that this doesn't need a background job. |
| **Database** | RFPs, questions, categories, configuration, scoping and knowledge records. A single embedded database file. |
| **Search index** | Knowledge passage embeddings, held in the same database. |
| **File store** | Uploaded spreadsheets, generated exports, knowledge source files, on the local filesystem. |
| **AI provider** | External text generation and embedding, reached through one internal interface (§7). |
| **Web lookup** | Fetching official documentation from allowed domains. |

### 11.2 Deployment (v1)

One container, one process, one port:

- The web client is built to static files and served by the API service.
- The database is a single embedded database file; the search index lives in it.
- The file store is a mounted directory.
- Database schema changes are applied through versioned migrations.

```
┌───────────────────── container ─────────────────────┐
│          static web client  ·  API service           │
│             embedded database + index                │
└──────────┬─────────────────────────┬─────────────────┘
           │ volume: data            │ external
           │ volume: knowledge       ├─▶ AI provider
                                     └─▶ allowed doc domains
```

No cloud deployment, queue, or horizontally-scaled service is designed for in v1 (see §16).
If the question set or knowledge base later grows enough to need one, that's a redesign to
make at that point, not now.

---

## 12. Folder structure

```
pursuit/
├── frontend/
├── backend/
├── config/
├── docs/
├── knowledge/
├── data/
├── deploy/
├── scripts/
├── e2e/
├── .env.example
├── .gitignore
└── README.md
```

| Folder | Description |
|---|---|
| **`frontend/`** | The web client: pages, components, styles including the DDN token file, static assets, and its unit tests. Builds to a static bundle. |
| **`backend/`** | The API service: routers, data models, business services (import, scoping, answering, export), the knowledge pipeline (ingestion, extraction, indexing, retrieval), web lookup, the AI provider implementation and prompt templates, database migrations, and its unit tests. |
| **`config/`** | Editable configuration seeds that are not code: bid criteria definitions, scoring thresholds, owner team list, allowed documentation domains, AI provider defaults, prompt configuration. Loaded at startup and editable through the settings screen. |
| **`docs/`** | This specification and all other definition documents: data model, API reference, prompt definitions, branding guide, roadmap. |
| **`knowledge/`** | DDN knowledge-base source material and its `sources.yaml`. Mounted read-only. Excluded from version control; only the README and an example source list are tracked. |
| **`data/`** | Runtime state: the database file, uploaded spreadsheets, generated exports, cached models. Mounted as a volume. Excluded from version control. |
| **`deploy/`** | Deployment definitions: the container image definition and the local compose file. |
| **`scripts/`** | Operational scripts for building, starting, stopping, restarting, viewing logs, ingesting knowledge, resetting and backing up data, running locally, and running tests. |
| **`e2e/`** | End-to-end test suite and its fixtures: a sample RFP spreadsheet and a small knowledge base. Tests the assembled application, not either half. |

Root files: `.env.example` documenting every variable in §13, `.gitignore`, and a `README.md`
quickstart.

---

## 13. Configuration

All configuration is supplied through environment variables, documented in `.env.example`.

| Variable | Default | Purpose |
|---|---|---|
| `PURSUIT_LLM_PROVIDER` | `openrouter` | `openrouter` \| `stub` |
| `PURSUIT_LLM_MODEL` | `dots-studio/dots-3-note-preview:free` | Model identifier (§7) |
| `PURSUIT_LLM_API_KEY` | — | Credential for the selected provider |
| `PURSUIT_LLM_DELAY_MS` | `1500` | Pause between calls when answering a question set |
| `PURSUIT_LLM_MAX_RETRIES` | `5` | Retry attempts on rate limiting or transient errors |
| `PURSUIT_EMBED_PROVIDER` | `local` | `local` \| `stub` |
| `PURSUIT_EMBED_MODEL` | local default | Embedding model identifier |
| `PURSUIT_RETRIEVAL_TOP_K` | `8` | Passages supplied per question |
| `PURSUIT_WEB_LOOKUP` | `on` | `on` \| `off` |
| `PURSUIT_WEB_ALLOWED_DOMAINS` | `ddn.com` | Comma-separated allow-list for documentation lookup |
| `PURSUIT_DATABASE_URL` | embedded file | Database connection |
| `PURSUIT_FILE_STORE_PATH` | `./data` | File store root |
| `PURSUIT_KNOWLEDGE_PATH` | `./knowledge` | Knowledge source root |
| `PURSUIT_BIND` | `127.0.0.1` | Bind address |
| `PURSUIT_PORT` | `8080` | Port |

---

## 14. Deployment and operations

### 14.1 Container

A single image built in two stages: the web client is built to static files, then copied
into the runtime image alongside the API service. One process, one port, no additional
services. On startup the container applies database migrations, seeds configuration from
`config/`, and loads the search index.

### 14.2 Scripts

| Script | Purpose |
|---|---|
| `scripts/build.sh` | Build the container image |
| `scripts/start.sh` | Start the container, wait for health, print the application URL |
| `scripts/stop.sh` | Stop the container, preserving data |
| `scripts/restart.sh` | Stop then start |
| `scripts/logs.sh` | Follow container logs |
| `scripts/ingest.sh` | Run knowledge ingestion |
| `scripts/reset-db.sh` | Delete the database after explicit confirmation |
| `scripts/backup.sh` | Archive the data directory |
| `scripts/dev.sh` | Run the API service and web client locally with hot reload |
| `scripts/test.sh` | Run backend and frontend unit tests |
| `scripts/e2e.sh` | Build, start, run the end-to-end suite, tear down |

---

## 15. Testing

No automated test calls a live AI provider or the internet. All tests run with the `stub`
provider and a stubbed web lookup, both returning deterministic responses.

**Approach:** build tests incrementally alongside the app, not as a fixed checklist up
front. Start with the highest-risk logic — import parsing, the confidence rule, scoring,
and the export round-trip — then grow coverage as the rest of the app stabilizes. The
tables below describe the coverage to grow into, not a day-one requirement.

### 15.1 Unit tests — backend

| Area | Coverage |
|---|---|
| Import | Fixed three-column parsing, header row skipped, empty question rows ignored, existing answers in column C imported |
| Categories | Grouping from column A; empty cells fall back to General; all-empty produces a single General category |
| Knowledge pipeline | Text extraction per format, passage splitting, incremental re-ingestion |
| Retrieval | Known question returns the expected passage; ranking order |
| Web lookup | Allowed domains are fetched, all others refused; lookup disabled by configuration |
| Confidence rule | Low confidence, or no supporting content found, produces an empty answer, `needs_input` status and a gap note |
| Scoring | Points and importance multipliers, not-assessed criteria excluded, disqualifier forces no-bid, each threshold's bands |
| Stage derivation | The current stage for every combination of RFP and question data, including the no-bid path |
| Export | Answers written into column C of the original workbook; row order and categories preserved; optional extra columns |
| Status transitions | Automatic advancement, manual override, `no_bid` locking |
| API | Every endpoint: success, not found, validation failure |

### 15.2 Unit tests — frontend

Components are tested with mocked network responses.

- Progress stepper: correct completed, active and upcoming stages for each case.
- Question list: category grouping, per-group counts, empty-answer indicator.
- Owner and status dropdowns: correct update requests.
- Answer editor: automatic saving, unsaved-change handling.
- Filters: composition into query parameters.
- Scoping result: criteria, importance, evidence, threshold and recommendation all rendered.
- Settings: criteria and threshold dropdowns submit the expected values.
- Accessibility checks on the main screens.

### 15.3 End-to-end tests

Run against the built container with stubbed AI and web lookup, and a fixture knowledge
base.

1. **Import** — create an RFP, upload the fixture spreadsheet, verify questions are
   imported in row order and grouped by the categories in column A.
2. **Fallback category** — import a spreadsheet with an empty column A and verify all
   questions appear under General.
3. **Scoping and no-bid** — run scoping, verify the criteria, importance, threshold and
   evidence are displayed with the recommendation, record no-bid, verify the RFP closes.
4. **Auto-answer** — record bid, run answer-all, verify it completes, answered questions
   carry a citation, and unsupported questions have empty answers with gap notes and
   `needs_input` status.
5. **Review** — correct a generated answer, write an answer for an empty question, change
   an owner, approve both, verify counts update and changes persist across a reload.
6. **Export** — mark the RFP complete, download the workbook, verify answers appear in
   column C in the correct rows.

Cross-cutting: the progress stepper shows the correct stage at every step, and no page
produces client-side errors.

### 15.4 Manual verification

Before a release, a short manual pass against a live AI provider confirms that answers are
well-formed and that unsupported questions are correctly left empty.

---

## 16. Future scope

Not included in v1, recorded for later:

- Authentication and per-user permissions.
- Spreadsheets with a variable column layout, and a column-mapping step.
- Clean and compliance-matrix export formats.
- Promoting approved answers from a completed RFP into the knowledge base.
- Audio and video transcription at ingestion.
- Notifications to assigned owner teams.
- Word document export.
- Answer quality feedback captured from reviewers and used to improve retrieval.
- Structured, multi-source citations (more than one source per answer, a clickable citation
  list), if a single line of text per answer stops being enough.
- Keyword/BM25 retrieval alongside semantic search, if semantic search alone proves
  insufficient.
- Scoping run history (previous runs kept viewable), if there's a real need to look back.
- Background job tracking with live progress, cancellation and resume, if question sets
  grow well beyond a single-request batch.
- Additional AI providers beyond OpenRouter, and additional knowledge ingestion formats
  (`.xlsx`, `.csv`, `.html`, `.vtt`, `.srt`), each added when a real need for it shows up.
- Per-call AI usage logging as a queryable entity (cost/token dashboards), if needed beyond
  structured log output.
- Splitting into separately deployable, horizontally-scalable services (queue-backed
  worker, managed database, object storage, CDN) if usage outgrows a single small team.
