mod db;

use tauri::Manager;

/// Where the person's own data lives: notes, highlights, reading progress, saved words.
/// Separate from the bundled Bible database, which is read-only and replaced on update.
#[tauri::command]
fn library_path(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No app data folder: {e}"))?;
    Ok(dir.to_string_lossy().into_owned())
}

/// Every book in canonical order. Returns an empty list until the database is built —
/// run `npm run data:build`.
#[tauri::command]
fn books(state: tauri::State<db::Library>) -> Result<Vec<db::Book>, String> {
    state.books().map_err(|e| e.to_string())
}

/// A chapter in Hebrew or Greek.
#[tauri::command]
fn original(
    edition: String,
    book_id: u32,
    chapter: u32,
    state: tauri::State<db::Library>,
) -> Result<Vec<db::Verse>, String> {
    state
        .original(&edition, book_id, chapter)
        .map_err(|e| e.to_string())
}

/// Searches one edition of the whole Bible.
#[tauri::command]
fn search(
    query: String,
    edition: String,
    state: tauri::State<db::Library>,
) -> Result<Vec<db::Hit>, String> {
    state
        .search(&query, &edition, 200)
        .map_err(|e| e.to_string())
}

/// Writes a backup to a file the person chose in the save dialog.
///
/// Deliberately narrow rather than a general write command: the path must end in .json
/// and the contents are capped, so a page script cannot use it to write anywhere on the
/// disk. The path itself comes from the system save dialog, never from the page.
#[tauri::command]
fn save_backup(path: String, contents: String) -> Result<(), String> {
    let target = std::path::PathBuf::from(&path);
    if target.extension().and_then(|e| e.to_str()) != Some("json") {
        return Err("A backup is saved as a .json file.".into());
    }
    if contents.len() > 64 * 1024 * 1024 {
        return Err("That backup is too large to write.".into());
    }
    std::fs::write(&target, contents).map_err(|e| e.to_string())
}

/// Reads a backup the person chose in the open dialog.
#[tauri::command]
fn open_backup(path: String) -> Result<String, String> {
    let target = std::path::PathBuf::from(&path);
    if target.extension().and_then(|e| e.to_str()) != Some("json") {
        return Err("A backup is a .json file.".into());
    }
    match target.metadata() {
        Ok(meta) if meta.len() > 64 * 1024 * 1024 => {
            return Err("That file is too large to be a backup.".into())
        }
        Ok(_) => {}
        Err(e) => return Err(e.to_string()),
    }
    std::fs::read_to_string(&target).map_err(|e| e.to_string())
}

/// A chapter of Scripture, verse by verse.
#[tauri::command]
fn chapter(
    book: String,
    chapter: u32,
    state: tauri::State<db::Library>,
) -> Result<Vec<db::Verse>, String> {
    state.chapter(&book, chapter).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let library = db::Library::open(app.handle())?;
            app.manage(library);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            library_path,
            books,
            chapter,
            original,
            search,
            save_backup,
            open_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running the app");
}
