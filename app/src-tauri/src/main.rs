// Hides the console window that Windows would otherwise open behind a release build.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    bible_study_lib::run()
}
