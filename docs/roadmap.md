# Roadmap

The full plan lives in the Claude doc. This is the build order.

## Now: foundation

- [x] Folder structure and monorepo
- [x] Tauri 2 and React app shell
- [x] Design tokens wired in, light and dark
- [x] Icon set
- [x] Update manager
- [x] Build and release automation
- [x] SQLite schema and KJV import
- [ ] First installer built and run on Windows
- [ ] Repository created and pushed

## Done: the reader

The reader came first because every other screen opens from the text.

- [x] Book and chapter navigation across all 66 books, with a searchable picker
- [x] Scripture rendered with the reading settings applied
- [x] Verse selection and the 30 highlight colours
- [x] The study panel beside the text, with a tab per source
- [x] Arrow keys turn chapters, crossing book boundaries
- [ ] Blue name marks and red place marks — waiting on the Theographic import
- [ ] Notes on a verse, chapter, and book
- [ ] Highlights and settings saved to the person's library rather than this device

## Then

- [ ] Start portal with the verse of the day and Continue reading
- [ ] Reading plan and the time maths
- [ ] People cards and the family tree
- [ ] Place cards and the map
- [ ] Hebrew and Greek lookup and search every instance
- [ ] Command palette
- [ ] Cross-references
- [ ] Settings
- [ ] Sign-in and sync
- [ ] AI chapter overviews
- [ ] Quiz and spaced review

## Later

The 25 ideas in the plan doc, starting with the split view, memory-verse mode, and the
reading heatmap.

## Decisions already made

| Question    | Answer                                                |
| ----------- | ----------------------------------------------------- |
| Platform    | Windows desktop first, other platforms later          |
| Translation | KJV first; five others wait on publisher permission   |
| Stack       | Tauri 2 with Rust, React and TypeScript, local SQLite |
| Main colour | #D6C2A5                                               |
| Motion      | macOS-style springs                                   |
| Sign-in     | Google, plus a 6-digit code by email                  |

## Still open

- Which default the reading plan opens on: 90 days, 1 year, or 2 years
- Whether sign-in uses a password plus a code, or codes alone
- How far Version 1 covers: all of Genesis, or a few chapters to test
