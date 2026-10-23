//! Reading from the bundled Bible database.
//!
//! The database ships inside the installer and is read-only. Search runs here in Rust
//! rather than in the interface, so a search across 31,000 verses never freezes the window.

use std::collections::HashMap;
use std::sync::Mutex;

use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize)]
pub struct Verse {
    pub number: u32,
    pub text: String,
    pub heading: Option<String>,
}

/// One search result: where it is, the verse, and where the match falls in it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Hit {
    pub book_id: u32,
    pub book: String,
    pub chapter: u32,
    pub verse: u32,
    pub text: String,
    pub at: (usize, usize),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Book {
    pub id: u32,
    pub name: String,
    pub abbreviation: String,
    pub testament: String,
    pub chapters: u32,
    pub words: u32,
    /// Words in each chapter, in order. The reading plan assigns days by words.
    pub chapter_words: Vec<u32>,
}

pub struct Library {
    connection: Mutex<Option<Connection>>,
}

impl Library {
    /// Opens the bundled database. A missing database is not an error: the app opens
    /// and says so, rather than refusing to start.
    pub fn open(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let path = app
            .path()
            .resolve("resources/bible.db", tauri::path::BaseDirectory::Resource)
            .ok();

        let connection = match path {
            Some(path) if path.exists() => match Connection::open(&path) {
                Ok(connection) => Some(connection),
                Err(error) => {
                    log::warn!("Could not open the Bible database: {error}");
                    None
                }
            },
            _ => {
                log::warn!("No Bible database found. Run `npm run data:build`.");
                None
            }
        };

        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    /// Every book in canonical order. Empty until the database is built.
    pub fn books(&self) -> rusqlite::Result<Vec<Book>> {
        let guard = self.connection.lock().expect("database lock poisoned");
        let Some(connection) = guard.as_ref() else {
            return Ok(Vec::new());
        };

        // Words per chapter as well as per book: the reading plan assigns days by
        // words, and chapters are wildly uneven.
        let mut per_chapter = connection.prepare(
            "SELECT book_id, chapter, SUM(word_count) AS words
               FROM verses
           GROUP BY book_id, chapter
           ORDER BY book_id, chapter",
        )?;

        let mut chapter_words: HashMap<u32, Vec<u32>> = HashMap::new();
        for row in
            per_chapter.query_map([], |row| Ok((row.get::<_, u32>(0)?, row.get::<_, u32>(2)?)))?
        {
            let (book_id, words) = row?;
            chapter_words.entry(book_id).or_default().push(words);
        }

        let mut statement = connection.prepare(
            "SELECT b.id, b.name, b.abbreviation, b.testament, b.chapter_count,
                    COALESCE(SUM(v.word_count), 0) AS words
               FROM books b
          LEFT JOIN verses v ON v.book_id = b.id
           GROUP BY b.id
           ORDER BY b.position",
        )?;

        let rows = statement.query_map([], |row| {
            let id: u32 = row.get(0)?;
            Ok(Book {
                id,
                name: row.get(1)?,
                abbreviation: row.get(2)?,
                testament: row.get(3)?,
                chapters: row.get(4)?,
                words: row.get(5)?,
                chapter_words: chapter_words.get(&id).cloned().unwrap_or_default(),
            })
        })?;

        rows.collect()
    }

    /// A chapter in Hebrew or Greek. Empty where that edition does not cover the book.
    pub fn original(
        &self,
        edition: &str,
        book_id: u32,
        chapter: u32,
    ) -> rusqlite::Result<Vec<Verse>> {
        let guard = self.connection.lock().expect("database lock poisoned");
        let Some(connection) = guard.as_ref() else {
            return Ok(Vec::new());
        };

        let mut statement = connection.prepare(
            "SELECT verse, text FROM verses_original
              WHERE edition = ?1 AND book_id = ?2 AND chapter = ?3
              ORDER BY verse",
        )?;

        let rows = statement.query_map(rusqlite::params![edition, book_id, chapter], |row| {
            Ok(Verse {
                number: row.get(0)?,
                text: row.get(1)?,
                heading: None,
            })
        })?;

        rows.collect()
    }

    /// Searches one edition. The English goes through SQLite's full-text index; the
    /// Hebrew and Greek are scanned, which is fast enough at this size and avoids
    /// tokenising scripts the index was not built for.
    pub fn search(&self, query: &str, edition: &str, limit: u32) -> rusqlite::Result<Vec<Hit>> {
        let guard = self.connection.lock().expect("database lock poisoned");
        let Some(connection) = guard.as_ref() else {
            return Ok(Vec::new());
        };

        let needle = query.trim().to_lowercase();
        if needle.chars().count() < 2 {
            return Ok(Vec::new());
        }

        let mut hits = Vec::new();

        if edition == "kjv" {
            let mut statement = connection.prepare(
                "SELECT b.id, b.name, v.chapter, v.verse, v.text
                   FROM verses_fts f
                   JOIN verses v ON v.id = f.rowid
                   JOIN books b ON b.id = v.book_id
                  WHERE verses_fts MATCH ?1
                  ORDER BY v.id
                  LIMIT ?2",
            )?;
            // Quoted so punctuation in the query cannot be read as query syntax.
            let phrase = format!("\"{}\"", needle.replace('"', ""));
            let rows = statement.query_map(rusqlite::params![phrase, limit], |row| {
                Ok((
                    row.get::<_, u32>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, u32>(2)?,
                    row.get::<_, u32>(3)?,
                    row.get::<_, String>(4)?,
                ))
            })?;
            for row in rows {
                let (book_id, book, chapter, verse, text) = row?;
                let at = text
                    .to_lowercase()
                    .find(&needle)
                    .map(|start| (start, start + needle.len()))
                    .unwrap_or((0, 0));
                hits.push(Hit {
                    book_id,
                    book,
                    chapter,
                    verse,
                    text,
                    at,
                });
            }
        } else {
            let mut statement = connection.prepare(
                "SELECT b.id, b.name, o.chapter, o.verse, o.text
                   FROM verses_original o
                   JOIN books b ON b.id = o.book_id
                  WHERE o.edition = ?1 AND o.text LIKE ?2
                  ORDER BY o.book_id, o.chapter, o.verse
                  LIMIT ?3",
            )?;
            let like = format!("%{}%", query.trim());
            let rows = statement.query_map(rusqlite::params![edition, like, limit], |row| {
                Ok((
                    row.get::<_, u32>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, u32>(2)?,
                    row.get::<_, u32>(3)?,
                    row.get::<_, String>(4)?,
                ))
            })?;
            for row in rows {
                let (book_id, book, chapter, verse, text) = row?;
                let at = text
                    .find(query.trim())
                    .map(|start| (start, start + query.trim().len()))
                    .unwrap_or((0, 0));
                hits.push(Hit {
                    book_id,
                    book,
                    chapter,
                    verse,
                    text,
                    at,
                });
            }
        }

        Ok(hits)
    }

    pub fn chapter(&self, book: &str, chapter: u32) -> rusqlite::Result<Vec<Verse>> {
        let guard = self.connection.lock().expect("database lock poisoned");
        let Some(connection) = guard.as_ref() else {
            return Ok(Vec::new());
        };

        let mut statement = connection.prepare(
            "SELECT v.verse, v.text, v.heading
               FROM verses v
               JOIN books b ON b.id = v.book_id
              WHERE (b.name = ?1 OR b.abbreviation = ?1) AND v.chapter = ?2
              ORDER BY v.verse",
        )?;

        let rows = statement.query_map(rusqlite::params![book, chapter], |row| {
            Ok(Verse {
                number: row.get(0)?,
                text: row.get(1)?,
                heading: row.get(2)?,
            })
        })?;

        rows.collect()
    }
}
