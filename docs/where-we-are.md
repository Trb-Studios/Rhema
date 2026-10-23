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
- **Cross-references**: 193,436 of them across 29,324 verses, strongest first, each
  shown with its own words beside the passage rather than as an address to look up.
- **Search** across any edition, ignoring vowel points and accents so Hebrew and Greek
  can be searched as typed.
- Arrow keys turn chapters, crossing from one book into the next.

**Marking up**

- **People and places marked in the text**, as individuals rather than as names: 3,027
  people and 924 places. Blue for people, red for places. Clicking one opens a card with
  who they were, their family — each relative openable in turn, which is the genealogy —
  and every verse that names them. Mary the mother of Jesus and Mary Magdalene are
  different people, and Peter is also Simon, Simeon, Cephas and Bar-Jona.
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
- **A quiz on any book**, generated from the text: the wording of a verse, whereabouts
  in the book something happens, and who is named in it. No model is involved, so no
  question can invent a verse or misattribute a saying.
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
- **Every claim about a name is checked against the King James text before it is kept.**
  A name is recorded only where one of its spellings is actually printed in that verse,
  and only where the text capitalises it — without that last rule the Negev, which the
  dataset calls South, marked the word "south" in "toward the south". 28,426 of 31,718
  claims survive; the rest are mostly places the King James spells differently, and are
  dropped rather than marked on the wrong word.
- **Where one spelling means two people, the card asks which.** About one marked verse
  in 250 — the two Marys of John 19:25, the two Harans of Genesis 11:31 — and picking
  one would be a guess presented as a fact.
- **The descriptions written by an AI are not used.** The names dataset carries longer
  prose written by a model in 2024 and since adapted. Someone studying Scripture should
  not be shown a machine's account of a person as though it were the scholarship, and
  this app cannot check it. The one-line descriptions shown are built from the
  structured fields.
- **The quiz is generated from the text, not by a model,** for the same reason: a
  question drawn from the actual words cannot invent a verse or attribute a saying to
  the wrong person, and the app shows the verse either way.
- **Notes, highlights, settings and progress live on the device** for now, and move to
  the person's account when sign-in lands. Backup is the stopgap.

## Tests

`npm test` runs 142 tests over the logic where a wrong number would be invisible in the
interface: the plan scheduling, the review intervals, the streak, the dates, the
backup merge rules, the names parser, the cross-references and the quiz generator. The plan tests schedule the real 789,634-word text rather than a
fixture, because the whole argument for scheduling by words is how uneven the real
chapters are.

## Next, in order

1. Pictures for the people, which needs a fetch at runtime on a machine that can reach
   Wikimedia. Nothing in this container can.
2. Sign-in, so notes and highlights follow the person between machines, with 2FA by
   email and Google as an option.
3. AI chapter overviews, once there is a server to hold the key.
4. Other translations. Only the KJV is public domain; NIV, ESV, NLT, NKJV and CSB each
   need permission from their publisher. See `docs/data-licenses.md`.

## Known gaps

- **The app has never been run on Windows.** Everything has been exercised as a web build
  and in CI. The installer builds; nobody has installed it.
- Builds are unsigned until `TAURI_SIGNING_PRIVATE_KEY` is added to the repository
  secrets, so an installed copy cannot update itself yet. See `docs/releasing.md`.
- Comments from other readers on a book, chapter or verse need a server and accounts;
  nothing is built.
