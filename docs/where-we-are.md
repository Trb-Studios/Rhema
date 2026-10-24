# Where we are

Written 23 October 2026, at v0.2. Read this first when picking the project back up.

## What works today

Rhema is dark first, with a tan accent: a Linear-style sidebar on the left, Scripture in
the middle, and a Raycast-style command palette (Ctrl K) that reaches everything.

**Getting around**

- **Sidebar** with Today, Read, People, Places, Quiz, Notebook and Highlights, plus the
  books read most recently. Ctrl 1–7 jump between them, Ctrl \ collapses it, Alt ← goes
  back.
- **Command palette.** Type a passage (`jn 3 16`), a person, a place, a command or any
  words in the text. Tab changes scope; the right side previews the result before it is
  opened.

**Reading**

- **The full KJV**, bundled and offline: 66 books, 1,189 chapters, 789,634 words.
- **Hebrew and Greek the way greekbible.com does it.** Switch the edition and the
  chapter reads in the original — the Westminster Leningrad Codex or the SBL Greek New
  Testament — with the King James line beneath each verse. Hovering any word shows its
  dictionary form, meaning and parsing; clicking opens the full word study.
- **An introduction to every book**, cross-references (193,436 of them), search across
  any edition, and arrow keys to turn chapters.

**Marking up**

- **Highlights on any words**, not just whole verses: select a phrase and pick one of 9
  quick colours or 30 in all. The Highlights screen gathers them by book, filterable by
  colour.
- **Sticky notes per book.** Paper notes pinned to a book, optionally to a verse, that
  stay with the book rather than the chapter.
- **One notebook for everything.** A single running document across all books that never
  resets per chapter, with an outline and "add heading for this passage". Notes written
  per chapter in v0.1 were moved into it once, under their own headings.
- **People and places marked in the text**, opening a card with a portrait or photo.

**People and places**

- **A People tab.** Search any name. 3,027 people, every verse that names each, and for
  2,678 of them a fuller record: Easton's entry, family, and years where known. 166 have
  a painting or famous portrait,
  the rest marked "No portrait known" rather than given an invented face.
- **One name, several people.** Searching James shows each James separately — the son
  of Zebedee, the son of Alphaeus, the Lord's brother — each with what tells him apart
  and his passages. Where tradition makes two into one (James the less, Judas not
  Iscariot and Thaddaeus, Bartholomew and Nathanael, and 13 others), a note explains the
  case for and against instead of merging them.
- **A Places tab.** 924 places, 878 located: where each is now, how confident that
  identification is, the alternatives, how far it lies from Jerusalem, a small map of
  its biblical neighbours, and a photograph for 604 of them.

**Remembering, which is the point of the app**

- **The quiz is a game now.** Every book has its own written questions — 50 for long
  books, 20 under 30 chapters, 10 under 10: 1,380 in all — on the story, what it shows
  of God, and what to remember. Three levels:
  - **Easy**: multiple choice, no clock.
  - **Medium**: mostly multiple choice, a minute a question, about one in three typed,
    with spelling forgiven.
  - **Hard**: typed answers, putting events in order, matching, and filling in verses.

  Points, a streak multiplier, lives, stars per book, a best score, and a results screen
  that goes through what was missed with the verse. **Flashcards** flip for study
  without scoring.

- **Spaced review** over saved verses (SM-2), a **reading plan** in actual days, and
  marking chapters read for progress and the streak — unchanged from v0.1.

**Keeping it**

- **Backup and restore** to a plain JSON file, now including highlights, sticky notes,
  the notebook and quiz scores.
- **An installer that updates itself**, built on every push.

## Decisions worth remembering

- **Some text is now written with AI, and says so.** The quiz questions and the notes on
  disputed identities were written with AI and carry the gold sparkle wherever they
  appear. Biographies stay Easton's Bible Dictionary (public domain) and are labelled as
  such. This reverses v0.1's rule against AI prose, by choice.
- **Every quiz question is held to the text.** `npm run quiz:check` confirms each
  reference exists, each quoted fill-in matches the King James word for word, each book
  has exactly the number of questions its length calls for, and each question has what
  its kind needs. CI runs it.
- **Typed answers forgive spelling but not near-misses.** Answers are compared after
  normalising case, punctuation, "the" and number words ("seventy and five" is 75), within
  an edit distance that grows with length. Answers of four letters or fewer must be exact,
  and an answer closer to a wrong option than to the right one is marked wrong, so
  "Saul" never passes for "Paul".
- **People are matched to Theographic by verses, not names.** Two people called James
  share a name but not their verses; scoring overlap (Jaccard) one-to-one within a name
  stopped the lesser James taking the apostle's record.
- **Pictures are bundled, not fetched.** Wikimedia Commons images, chosen through
  Wikidata, filtered to licences that allow reuse, at 330 px, credited on each picture.
  About 28 MB, so the People and Places tabs work with no connection.
- **Three animation rules came out of real bugs.**
  - A framer-motion `layoutId` inside an exiting `AnimatePresence` stalls the exit and
    left screens blank, so tab pills use `SlidingHighlight`, which measures instead.
  - Popovers render through `Portal`, because a transformed ancestor shifts fixed
    positioning by the sidebar's width.
  - The shell uses `overflow: clip`, so `scrollIntoView` cannot slide the whole window
    sideways.
- **Dates are local, never UTC**, through `lib/dates.ts`. **Shared state goes through
  `lib/store.ts`.** Both still hold; see v0.1's reasons in the git history of this file.
- **Highlights are keyed by book, chapter and verse together**, and phrase highlights add
  character offsets within the verse.
- **Every claim about a name is checked against the King James text before it is kept**,
  and where one spelling in a verse could mean two people, the card asks which.

## Tests

`npm test` runs 252 tests. They cover the logic where a wrong number would be invisible:
plan scheduling, review intervals, the streak, dates, backup merge rules, names, cross
references, phrase highlights, quiz rounds, lenient answer matching, and that every bank
holds exactly the right number of questions. `npm run quiz:check` checks the quiz text
itself against the KJV.

## Next, in order

1. Sign-in, so notes and highlights follow the person between machines, with 2FA by
   email and Google as an option.
2. AI chapter overviews, once there is a server to hold the key.
3. Other translations. Only the KJV is public domain; NIV, ESV, NLT, NKJV and CSB each
   need permission from their publisher. See `docs/data-licenses.md`.

## Known gaps

- Builds from CI are unsigned until `TAURI_SIGNING_PRIVATE_KEY` is added to the
  repository secrets, so an installed copy cannot update itself yet. See
  `docs/releasing.md`.
- About 350 people have no Theographic match, so their profile is the one-line
  description only.
- Comments from other readers need a server and accounts; nothing is built.
