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

    pub fn chapter(&self, book: &str, chapter: u32) -> rusqlite::Result<Vec<Verse>> {
        let guard = self.connection.lock().expect("database lock poisoned");
        let Some(connection) = guard.as_ref() else {
            return Ok(Vec::new());
        };

        let mut statement = connection.prepare(
            "SELECT v.verse, v.text
               FROM verses v
               JOIN books b ON b.id = v.book_id
              WHERE (b.name = ?1 OR b.abbreviation = ?1) AND v.chapter = ?2
              ORDER BY v.verse",
        )?;

        let rows = statement.query_map(rusqlite::params![book, chapter], |row| {
            Ok(Verse {
                number: row.get(0)?,
                text: row.get(1)?,
            })
        })?;

        rows.collect()
    }
}
