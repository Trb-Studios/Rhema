# Translations and dataset licences

Nothing goes in the app until its licence allows it. This is the record of what is
cleared, what is pending, and who to ask.

## Translations

| Translation | Rights holder           | In the app  | How to ask                                                                                                                          |
| ----------- | ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| KJV         | Public domain in the US | **Bundled** | Nothing to ask                                                                                                                      |
| NIV         | Biblica                 | Links out   | Permission request form at biblica.com, or a free express licence through api.bible or YouVersion for a strictly non-commercial app |
| ESV         | Crossway                | Links out   | The ESV API covers non-commercial use; formal licences go to organisations, not individuals                                         |
| NLT         | Tyndale                 | Links out   | Tyndale's Permissions Questionnaire                                                                                                 |
| NKJV        | HarperCollins Christian | Links out   | HarperCollins Christian permission request form; a full-Bible app needs a paid licence                                              |
| CSB         | Holman / Lifeway        | Links out   | Check the CSB's own site; the policy page found so far covered the older HCSB                                                       |

Free quoting limits sit around 500 verses for most publishers, which no whole-Bible
reader can stay inside. Every one of these needs a real licence.

Two things shape the design:

- **AI.** Biblica states that any AI-related use needs a separate licence. Chapter
  overviews and quiz cards therefore run on the KJV only until a publisher grants AI
  rights in writing.
- **Tagging and search.** Crossway's terms cap local caching at 500 verses, which reads
  as ruling out whole-Bible name tagging or full-text search over the ESV. That is an
  interpretation of their terms, not their statement. Confirm with Crossway before
  building on it.

Biblica generally will not license a product still in development, so apply once the app
works. Expect several weeks and possibly a fee. Full-Bible licences may require a
registered legal entity.

## Datasets

Every dataset, its licence, and its status is in
[`../data/sources.json`](../data/sources.json). Two carry obligations worth repeating:

- **Open Scriptures Hebrew Bible** (CC BY 4.0) and **OpenBible.info geocoding**
  (CC BY 4.0) both require attribution. Credits go in the app's About screen.
- **Theographic Bible Metadata** (CC BY-SA 4.0) carries ShareAlike. That applies to the
  dataset and anything derived from it, not to the app's own code. Keep derived data
  separable so the obligation stays where it belongs.

## The KJV outside the United States

The KJV is public domain in the United States. In the United Kingdom it is under
perpetual Crown copyright, administered by Cambridge University Press. Check this before
distributing the app outside the US.

## Before shipping

- [ ] Confirm the KJV source file matches a trusted published edition
- [ ] Put every required attribution in the About screen
- [ ] Get written permission before bundling any licensed translation
- [ ] Get written AI rights before running overviews or quizzes on licensed text

None of this is legal advice. For anything that turns commercial, ask a lawyer.
