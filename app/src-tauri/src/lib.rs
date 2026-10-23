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

/// A chapter of Scripture, verse by verse. Returns an empty list until the database
/// is built — run `npm run data:build`.
#[tauri::command]
fn chapter(book: String, chapter: u32, state: tauri::State<db::Library>) -> Result<Vec<db::Verse>, String> {
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
        .invoke_handler(tauri::generate_handler![library_path, chapter])
        .run(tauri::generate_context!())
        .expect("error while running the app");
}
