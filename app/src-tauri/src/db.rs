//! Reading from the bundled Bible database.
//!
//! The database ships inside the installer and is read-only. Search runs here in Rust
//! rather than in the interface, so a search across 31,000 verses never freezes the window.

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

#[derive(Debug, Serialize)]
pub struct Book {
    pub id: u32,
    pub name: String,
    pub abbreviation: String,
    pub testament: String,
    pub chapters: u32,
    pub words: u32,
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

        let mut statement = connection.prepare(
            "SELECT b.id, b.name, b.abbreviation, b.testament, b.chapter_count,
                    COALESCE(SUM(v.word_count), 0) AS words
               FROM books b
          LEFT JOIN verses v ON v.book_id = b.id
           GROUP BY b.id
           ORDER BY b.position",
        )?;

        let rows = statement.query_map([], |row| {
            Ok(Book {
                id: row.get(0)?,
                name: row.get(1)?,
                abbreviation: row.get(2)?,
                testament: row.get(3)?,
                chapters: row.get(4)?,
                words: row.get(5)?,
            })
        })?;

        rows.collect()
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
