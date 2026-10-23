# Rhema

A Windows desktop app for reading the Bible cover to cover and actually remembering it.
Names and places are tagged in the text, Hebrew and Greek are a tap away, and what you
capture comes back as spaced review.

Built with Tauri 2 (Rust) and React. Everything works offline.

## Status

Foundation. The app shell, update manager, build pipeline, and design system are in place.
Features are being built in the order listed in `docs/roadmap.md`.

## Quick start

You need the Windows tools listed in [`docs/setup-windows.md`](docs/setup-windows.md) first.

```bash
npm install          # installs app dependencies
npm run dev          # runs the app in a window with live reload
npm run build        # builds a Windows installer into app/src-tauri/target/release/bundle
npm run data:build   # builds the SQLite database from the source datasets
```

## Layout

| Folder     | What lives there                                                                |
| ---------- | ------------------------------------------------------------------------------- |
| `app/`     | The desktop app. `src/` is the React interface, `src-tauri/` is the Rust shell. |
| `data/`    | Dataset download and import scripts, the SQLite schema, and the built database. |
| `design/`  | Design tokens (JSON for Figma, CSS for the app) and the icon set.               |
| `docs/`    | Setup guide, decisions, roadmap, and dataset licenses.                          |
| `server/`  | Sign-in and AI functions. Added in a later phase.                               |
| `.github/` | Build and release automation.                                                   |

## Translations

The KJV is public domain and ships inside the app. NIV, ESV, NLT, NKJV, and CSB each need
permission from their publisher and are not included. See
[`docs/data-licenses.md`](docs/data-licenses.md).

## Releases

Every push to `main` is built and checked. Tagging `v0.1.0` builds a signed Windows
installer, publishes it to GitHub Releases, and the update manager picks it up. See
[`docs/releasing.md`](docs/releasing.md).
