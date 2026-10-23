-- The Bible database. Read-only, bundled inside the installer, rebuilt by
-- `npm run data:build`. The person's own notes and highlights live in a separate
-- file in their app data folder, so an update never touches their work.
--
-- The verse is the key that joins everything: a person, a place, a word, a note,
-- and a highlight all point at one.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- Scripture

CREATE TABLE IF NOT EXISTS books (
  id            INTEGER PRIMARY KEY,   -- 1 Genesis … 66 Revelation
  name          TEXT NOT NULL UNIQUE,
  abbreviation  TEXT NOT NULL UNIQUE,
  testament     TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
  chapter_count INTEGER NOT NULL,
  position      INTEGER NOT NULL       -- canonical order
);

CREATE TABLE IF NOT EXISTS verses (
  id         INTEGER PRIMARY KEY,
  book_id    INTEGER NOT NULL REFERENCES books(id),
  chapter    INTEGER NOT NULL,
  verse      INTEGER NOT NULL,
  text       TEXT NOT NULL,
  -- Psalm 119's acrostic letters are section headings, not part of the verse. Kept
  -- apart so the text reads cleanly and the structure is still shown.
  heading    TEXT,
  word_count INTEGER NOT NULL,         -- the reading plan schedules by words, not chapters
  UNIQUE (book_id, chapter, verse)
);

CREATE INDEX IF NOT EXISTS verses_by_chapter ON verses (book_id, chapter);

-- Full-text search over Scripture. Kept in step with `verses` by the triggers below.
CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5 (
  text,
  content = 'verses',
  content_rowid = 'id',
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS verses_fts_insert AFTER INSERT ON verses BEGIN
  INSERT INTO verses_fts (rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS verses_fts_delete AFTER DELETE ON verses BEGIN
  INSERT INTO verses_fts (verses_fts, rowid, text) VALUES ('delete', old.id, old.text);
END;

CREATE TRIGGER IF NOT EXISTS verses_fts_update AFTER UPDATE ON verses BEGIN
  INSERT INTO verses_fts (verses_fts, rowid, text) VALUES ('delete', old.id, old.text);
  INSERT INTO verses_fts (rowid, text) VALUES (new.id, new.text);
END;

-- The Hebrew and Greek, as whole editions rather than a gloss over the English.
-- Versification follows each edition, which is not always the KJV's: the Hebrew counts
-- a psalm's title as a verse where the KJV does not, and the Greek New Testament rests
-- on a different manuscript base, so a few verses the KJV has are absent.
CREATE TABLE IF NOT EXISTS verses_original (
  id       INTEGER PRIMARY KEY,
  edition  TEXT NOT NULL CHECK (edition IN ('hebrew', 'greek')),
  book_id  INTEGER NOT NULL REFERENCES books(id),
  chapter  INTEGER NOT NULL,
  verse    INTEGER NOT NULL,
  text     TEXT NOT NULL,
  -- Each word with its dictionary form and parsing, as JSON.
  words    TEXT NOT NULL,
  UNIQUE (edition, book_id, chapter, verse)
);

CREATE INDEX IF NOT EXISTS originals_by_chapter
  ON verses_original (edition, book_id, chapter);

-- ------------------------------------------------- Hebrew and Greek

CREATE TABLE IF NOT EXISTS words (
  id              INTEGER PRIMARY KEY,
  strongs         TEXT NOT NULL UNIQUE,  -- H1288, G26
  language        TEXT NOT NULL CHECK (language IN ('hebrew', 'greek')),
  original        TEXT NOT NULL,         -- בָּרַךְ
  transliteration TEXT NOT NULL,         -- barak
  gloss           TEXT NOT NULL,         -- to bless; originally to kneel
  kjv_renderings  TEXT                   -- bless, blessed
);

CREATE INDEX IF NOT EXISTS words_by_transliteration ON words (transliteration);

-- Which original word sits behind which English word, so tapping a word in the
-- reader opens its Hebrew or Greek, and one word can be traced across all 66 books.
CREATE TABLE IF NOT EXISTS word_uses (
  verse_id    INTEGER NOT NULL REFERENCES verses(id),
  word_id     INTEGER NOT NULL REFERENCES words(id),
  word_index  INTEGER NOT NULL,          -- position within the verse
  surface     TEXT NOT NULL,             -- the English as it appears
  PRIMARY KEY (verse_id, word_index)
);

CREATE INDEX IF NOT EXISTS word_uses_by_word ON word_uses (word_id);

-- ------------------------------------------------- People and places

CREATE TABLE IF NOT EXISTS people (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  also_known   TEXT,                     -- Abraham; Elias
  meaning      TEXT,
  description  TEXT,
  gender       TEXT
);

CREATE TABLE IF NOT EXISTS relationships (
  person_id  INTEGER NOT NULL REFERENCES people(id),
  related_id INTEGER NOT NULL REFERENCES people(id),
  kind       TEXT NOT NULL CHECK (kind IN ('parent', 'child', 'spouse', 'sibling')),
  PRIMARY KEY (person_id, related_id, kind)
);

CREATE TABLE IF NOT EXISTS places (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  modern_name TEXT,                      -- Luz becomes Bethel
  description TEXT,
  latitude    REAL,
  longitude   REAL,
  precision   TEXT                       -- how sure the location is
);

-- Where a person or place is mentioned. One row per appearance, so a tap in the
-- reader opens the card and the card lists every verse.
CREATE TABLE IF NOT EXISTS mentions (
  verse_id    INTEGER NOT NULL REFERENCES verses(id),
  subject_id  INTEGER NOT NULL,
  subject     TEXT NOT NULL CHECK (subject IN ('person', 'place')),
  word_index  INTEGER,                   -- which word to tag, when known
  PRIMARY KEY (verse_id, subject, subject_id, word_index)
);

CREATE INDEX IF NOT EXISTS mentions_by_subject ON mentions (subject, subject_id);

-- ------------------------------------------------- Study helps

CREATE TABLE IF NOT EXISTS cross_references (
  from_verse_id INTEGER NOT NULL REFERENCES verses(id),
  to_verse_id   INTEGER NOT NULL REFERENCES verses(id),
  weight        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (from_verse_id, to_verse_id)
);

CREATE TABLE IF NOT EXISTS topics (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL UNIQUE,
  parent INTEGER REFERENCES topics(id)
);

CREATE TABLE IF NOT EXISTS topic_verses (
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  verse_id INTEGER NOT NULL REFERENCES verses(id),
  PRIMARY KEY (topic_id, verse_id)
);

-- ------------------------------------------------- Build record

CREATE TABLE IF NOT EXISTS build_info (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
