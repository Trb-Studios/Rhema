# Data

`npm run data:build` downloads the source datasets, loads them into one SQLite file at
`data/bible.db`, and copies it where the installer expects it.

The built database and the downloaded files are not committed. They are rebuilt from
`sources.json`, so anyone who clones the repo gets the same database from the same
sources rather than a binary nobody can audit.

## What lives where

| File                   | What it is                                               |
| ---------------------- | -------------------------------------------------------- |
| `schema.sql`           | The whole database shape, with a comment on every table  |
| `sources.json`         | Every dataset, its licence, and whether it is in use yet |
| `scripts/build-db.mjs` | Downloads, cleans, and loads the data                    |
| `raw/`                 | Downloaded files, kept so a rebuild does not re-download |
| `bible.db`             | The built database                                       |

## Adding a source

1. Add it to `sources.json` with its licence. If the licence does not allow bundling the
   data inside an app, it does not go in.
2. Add a loader to `scripts/build-db.mjs`.
3. If the licence asks for attribution, add the credit to the app's About screen.

## A note on size

The KJV alone is about 4.5 MB as text. With Strong's tagging, people, places, and
cross-references the database lands somewhere around 60 to 120 MB. That ships inside the
installer, which is why everything works offline. If it grows past that, the original
language tagging is the first thing to make optional.
