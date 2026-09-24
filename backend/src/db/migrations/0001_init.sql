-- Initial schema. See planning/pursuit-spec.md §8 for the logical data model.

CREATE TABLE rfps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  customer TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  decision TEXT,
  decision_rationale TEXT,
  source_file_name TEXT,
  source_file_path TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  rfp_id TEXT NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL
);
CREATE INDEX idx_categories_rfp ON categories(rfp_id);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  rfp_id TEXT NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL DEFAULT '',
  citation TEXT,
  answer_source TEXT,
  status TEXT NOT NULL DEFAULT 'unanswered',
  gap_note TEXT,
  owner_team_id TEXT NOT NULL,
  owner_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_questions_rfp ON questions(rfp_id);
CREATE INDEX idx_questions_category ON questions(category_id);

CREATE TABLE owner_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE bid_criteria (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  importance TEXT,
  is_disqualifier INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL
);

CREATE TABLE scoping_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  threshold TEXT NOT NULL DEFAULT 'balanced'
);

CREATE TABLE scoping_runs (
  id TEXT PRIMARY KEY,
  rfp_id TEXT NOT NULL UNIQUE REFERENCES rfps(id) ON DELETE CASCADE,
  criteria_json TEXT NOT NULL,
  disqualifier_triggered INTEGER NOT NULL,
  overall_score INTEGER,
  threshold TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE knowledge_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  location TEXT NOT NULL UNIQUE,
  content_hash TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  passage_count INTEGER NOT NULL DEFAULT 0,
  ingested_at TEXT,
  error TEXT
);

CREATE TABLE knowledge_passages (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  heading TEXT,
  text TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text',
  vector BLOB
);
CREATE INDEX idx_passages_document ON knowledge_passages(document_id);

-- Generated-answer cache (spec §7: "generated answers are cached, so
-- re-running generation does not repeat identical calls").
CREATE TABLE ai_cache (
  cache_key TEXT PRIMARY KEY,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
