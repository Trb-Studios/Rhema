# Where we are

Written 23 October 2026. Read this first when picking the project back up.

## What works today

Rhema is one screen: Scripture in the middle, a notepad beside it, and everything else
behind a button so nothing competes with the text.

**Reading**

- **The full KJV**, bundled and offline: 66 books, 1,189 chapters, 789,634 words.
- **Hebrew and Greek as editions you switch to**, not as words injected into the
  English. The Old Testament reads in the Westminster Leningrad Codex, the New in the
  SBL Greek New Testament, each numbered as its own tradition numbers it.
- **An introduction to every book** — time, author, place and background — giving the
  traditional view and the main scholarly alternative without choosing between them.
- **Search** across any edition, ignoring vowel points and accents so Hebrew and Greek
  can be searched as typed.
- Arrow keys turn chapters, crossing from one book into the next.

**Marking up**

- **People and places marked in the text.** Blue for people, red for places. Clicking one
  opens a card where the word stands.
- **Word study.** Clicking a Hebrew or Greek word gives its dictionary form, what it
  means, how it is parsed, and every other place it occurs. Counts were checked against
  published concordances: H7225 51 times, H430 2,600, λόγος 330, ἀγάπη 116.
- **Highlights** in any of the 30 colours, on any verse.
- **A notepad per chapter**, saved as you type.
- **Saved verses**, kept by reference so they can be read back in any edition.

**Remembering, which is the point of the app**

- **Spaced review** over saved verses, scheduled by SM-2: a verse comes back just before
  it would be forgotten, and the gap grows each time it is remembered. Two modes —
  Recall, which gives the reference, and Memorise, which gives the verse as first
  letters.
- **A reading plan as actual days.** Pick a pace and it says what to read today, how long
  it takes, how far through you are, how many days behind or ahead, and the date the pace
  you are actually keeping would finish on.
- **Marking chapters read**, which feeds progress and a streak.

**Keeping it**

- **Backup and restore** to a plain JSON file, with a choice of replacing what is here or
  merging two machines together.
- **An installer that updates itself**, built on every push and published to a permanent
  download link.

## Decisions worth remembering

- **The reading plan schedules by words, not chapters.** Psalm 117 is 33 words and Psalm
  119 is 2,423, so an even number of chapters is a wildly uneven amount of reading. Days
  are filled towards a running total rather than a daily quota, so rounding cannot
  accumulate: a 365-day plan ends on Revelation 22 on day 365.
- **Today's reading starts from the first unread chapter, not from the calendar.** A
  reader who misses a fortnight comes back to where they are, not to a backlog they will
  never face. Being behind is reported; catching up is offered, never imposed.
- **Dates are local, never UTC.** `toISOString().slice(0, 10)` gives the UTC date, which
  west of Greenwich rolls over mid-afternoon: an evening's reading was credited to
  tomorrow and streaks broke while they were being kept. Everything dated goes through
  `lib/dates.ts`.
- **Shared state goes through `lib/store.ts`.** Three separate bugs came from components
  each keeping their own copy: saving a verse never reached the panel, the plan and the
  reader disagreed about what was read, and the notepad overwrote every note with a stale
  copy when the window closed. Anything two components read belongs in the store.
- **The KJV edition was changed mid-project.** The first source rendered the divine name
  as "Lord" in ordinary case in all but 6 verses, and spelled places as "Beth–el" with a
  dash so names never matched. The edition now in use keeps LORD in 5,621 verses.
- **Highlights are keyed by book, chapter and verse together.** Keying on the verse number
  alone put one mark on Genesis 1:3 and John 3:3 at once.
- **The people and places file is a starter set** — 74 people, 43 places, and 9 names
  belonging to more than one person kept separate. Written by hand so the reader had
  something real to mark; replacing `data/people-places.json` with a full dataset needs
  no change to the reader.
- **Notes, highlights, settings and progress live on the device** for now, and move to
  the person's account when sign-in lands. Backup is the stopgap.

## Tests

`npm test` runs 81 tests over the logic where a wrong number would be invisible in the
interface: the plan scheduling, the review intervals, the streak, the dates and the
backup merge rules. The plan tests schedule the real 789,634-word text rather than a
fixture, because the whole argument for scheduling by words is how uneven the real
chapters are.

## Next, in order

1. Replace the starter people and places file with a full dataset. Theographic Bible
   Metadata is the candidate; it is CC BY-SA, so keep derived data separable.
2. Pictures for the people, which needs a fetch at runtime on a machine that can reach
   Wikimedia.
3. Cross-references. The obvious dataset is AGPL, which conflicts with this project's
   licence, and openbible.info could not be reached from here. Needs a source settled
   before any code.
4. Sign-in, so notes and highlights follow the person between machines, with 2FA by
   email and Google as an option.
5. AI chapter overviews and the Quiz, once there is a server to hold the key.
6. Other translations. Only the KJV is public domain; NIV, ESV, NLT, NKJV and CSB each
   need permission from their publisher. See `docs/data-licenses.md`.

## Known gaps

- **The app has never been run on Windows.** Everything has been exercised as a web build
  and in CI. The installer builds; nobody has installed it.
- Builds are unsigned until `TAURI_SIGNING_PRIVATE_KEY` is added to the repository
  secrets, so an installed copy cannot update itself yet. See `docs/releasing.md`.
- Comments from other readers on a book, chapter or verse need a server and accounts;
  nothing is built.
