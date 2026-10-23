# Decisions

One line each, newest first. A decision recorded here is settled until someone writes a
new line changing it.

| Date       | Decision                                | Why                                                                                                         |
| ---------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-10-22 | Windows desktop first                   | The app is for one person's daily reading, on a PC. Tauri keeps the door open to Mac, phone, and web later. |
| 2026-10-22 | Tauri 2 with Rust, React and TypeScript | A few MB rather than Electron's hundred, fast startup, and the same code can target other platforms.        |
| 2026-10-22 | SQLite bundled in the installer         | Opening a chapter or searching every use of a Hebrew word never waits on the network.                       |
| 2026-10-22 | KJV first                               | Public domain, so it needs no permission and can be tagged, searched, and used by AI freely.                |
| 2026-10-22 | #D6C2A5 as the main colour              | Chosen from the reference. It fills buttons and surfaces; it is never text, at 1.73:1 on white.             |
| 2026-10-22 | macOS-style spring motion               | Movement follows physics and can be interrupted, rather than running fixed curves to completion.            |
| 2026-10-22 | Updates through GitHub Releases, signed | Free, and Tauri refuses any update whose signature does not match.                                          |
