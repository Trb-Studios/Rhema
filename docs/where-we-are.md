# Where we are

Written 22 October 2026, at the end of a working session. Read this first when picking
the project back up.

## What works today

Rhema is one screen: Scripture on the left, a notepad on the right, and nothing else
competing with the text.

- **The full KJV.** 66 books, 1,189 chapters, 31,102 verses, bundled and offline.
- **People and places marked in the text.** Blue for people, red for places. Clicking one
  opens a small card where the word stands, with its meaning and a line on who or what it
  is. Genesis 12 marks Abram, Sarai, Lot, Haran, Canaan, Sichem, Egypt, and Pharaoh.
- **A notepad per chapter,** saved as you type.
- **Highlights** in any of the 30 colours, on any verse.
- **Marking chapters read,** which feeds progress and a streak.
- **One menu** holding progress, how long the rest would take, theme, text size, column
  width, and verse numbers.
- Arrow keys turn chapters, crossing from one book into the next.

## Decisions worth remembering

- **The KJV edition was changed mid-session.** The first source rendered the divine name
  as "Lord" in ordinary case: only 6 verses in the whole Bible kept the small-capital
  LORD that renders YHWH, which is a different word from "Lord". It also spelled places
  as "Beth–el" with a dash, so place names never matched. The edition now in use keeps
  LORD in 5,621 verses and spells names plainly. See `data/sources.json`.
- **The people and places file is a starter set,** written by hand so the reader had
  something real to mark. It deliberately leaves out names belonging to several different
  people, such as John and Mary, because marking every occurrence alike would be wrong.
  Replacing `data/people-places.json` with a full dataset needs no change to the reader.
- **Highlights are keyed by book, chapter, and verse together.** Keying on the verse
  number alone put one mark on Genesis 1:3 and John 3:3 at once.
- **Notes, highlights, settings, and progress live on the device** for now, and move to
  the person's account when sign-in lands.

## Next, in order

1. Render LORD in small capitals, the way the KJV intends. The text carries it; the
   reader does not style it yet.
2. Replace the starter people and places file with a full dataset. Theographic Bible
   Metadata is the candidate; it is CC BY-SA, so keep derived data separable.
3. Strong's numbers, so tapping any word opens its Hebrew or Greek and finds every other
   verse that uses it.
4. Sign-in, so notes and highlights follow the person between machines.
5. AI chapter overviews and the Quiz, once there is a server to hold the key.

## Known gaps

- The app has never been run on Windows. It has only been exercised as a web build.
- The installer cannot be built until the updater signing key exists. See
  `docs/releasing.md`; only the project owner can generate it.
- `npm run build` in the check workflow compiles the binary rather than packaging it,
  for the same reason.
