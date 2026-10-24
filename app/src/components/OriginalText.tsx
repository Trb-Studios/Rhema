import { motion } from 'framer-motion';
import type { Book, Verse } from '../lib/bible';
import type { Edition } from '../lib/editions';
import type { Word } from '../lib/words';
import type { Highlight } from '../lib/highlights';
import { HIGHLIGHT_OPACITY } from '../lib/highlights';
import { transition } from '../lib/motion';

/**
 * A chapter in Hebrew or Greek, verse by verse, with the English beneath each verse.
 *
 * The original is the text on the page. Every word answers a hover with what it means
 * and a click with a full word study. The King James sits under each verse in a quieter
 * italic, so the eye can check its reading without the English ever replacing the
 * original — the layout of a reader's interlinear rather than of a crib.
 */
export function OriginalText({
  book,
  number,
  edition,
  verses,
  words,
  english,
  showEnglish,
  verseNumbers,
  selected,
  spoken,
  colourOf,
  onSelect,
  onWordEnter,
  onWordLeave,
  onWordClick,
}: {
  book: Book;
  number: number;
  edition: Edition;
  verses: Verse[];
  words: Record<string, Word[]> | null;
  english: Verse[] | null;
  showEnglish: boolean;
  verseNumbers: boolean;
  selected: number | null;
  spoken: number | null;
  colourOf: (bookId: number, chapter: number, verse: number) => Highlight | undefined;
  onSelect: (verse: number | null) => void;
  onWordEnter: (word: Word, element: HTMLElement) => void;
  onWordLeave: () => void;
  onWordClick: (word: Word, element: HTMLElement) => void;
}) {
  // The Hebrew counts a psalm's title as its first verse, and sometimes its first two,
  // where the King James does not number it at all. Matching by number would pair every
  // verse with the one before it, so the English is shifted by however many the Hebrew
  // has extra. A title verse then has no English of its own.
  const offset =
    edition.id === 'hebrew' && book.name === 'Psalms' && english
      ? Math.max(0, verses.length - english.length)
      : 0;
  const englishFor = (verse: number) =>
    english?.find((candidate) => candidate.number === verse - offset) ?? null;

  const hebrew = edition.id === 'hebrew';

  return (
    <div className="selectable" style={{ display: 'grid' }}>
      {verses.map((verse, index) => {
        const chosen = colourOf(book.id, number, verse.number);
        const isSelected = selected === verse.number;
        const translation = showEnglish ? englishFor(verse.number) : null;
        const verseWords = words?.[`${number}:${verse.number}`];

        return (
          <motion.div
            key={verse.number}
            id={`verse-${verse.number}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition('smooth'), delay: Math.min(index * 0.018, 0.4) }}
            style={{
              position: 'relative',
              padding: '14px 0 14px 18px',
              borderBottom: '1px solid var(--line-faint)',
              borderRadius: 4,
              background:
                spoken === verse.number
                  ? 'color-mix(in srgb, var(--main-fill) 14%, transparent)'
                  : undefined,
              outline: isSelected ? '2px solid var(--focus-ring)' : undefined,
              outlineOffset: 2,
            }}
          >
            {/* A highlight shows as a bar in the margin, so the original's letters are
                never tinted into illegibility. */}
            {chosen && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 14,
                  bottom: 14,
                  width: 4,
                  borderRadius: 4,
                  background: `color-mix(in srgb, ${chosen.colour} ${Math.round(HIGHLIGHT_OPACITY * 200)}%, transparent)`,
                }}
              />
            )}

            <div
              dir={edition.direction}
              lang={hebrew ? 'he' : 'grc'}
              style={{
                fontFamily: edition.font,
                fontSize: hebrew ? '1.32em' : '1.08em',
                lineHeight: hebrew ? 1.85 : 1.75,
                textAlign: 'start',
              }}
            >
              {verseNumbers && (
                <button
                  onClick={() => onSelect(isSelected ? null : verse.number)}
                  aria-label={`Select verse ${verse.number}`}
                  className="tabular"
                  style={{
                    font: '600 11px var(--font-ui)',
                    verticalAlign: 'super',
                    color: 'var(--text-faint)',
                    marginInlineEnd: '0.4em',
                  }}
                >
                  {verse.number}
                </button>
              )}
              {verseWords
                ? verseWords.map((word, wordIndex) => (
                    <span key={wordIndex}>
                      <span
                        role="button"
                        tabIndex={-1}
                        className="word"
                        onPointerEnter={(event) => onWordEnter(word, event.currentTarget)}
                        onPointerLeave={onWordLeave}
                        onClick={(event) => onWordClick(word, event.currentTarget)}
                        style={{ borderRadius: 4, padding: '0 2px', margin: '0 -2px' }}
                      >
                        {word[0]}
                      </span>{' '}
                    </span>
                  ))
                : verse.text}
            </div>

            {showEnglish && (
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: '1px dashed var(--line-default)',
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: '0.84em',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                }}
              >
                {translation ? (
                  <>“{translation.text}”</>
                ) : (
                  <span style={{ color: 'var(--text-faint)', fontStyle: 'normal', fontSize: 12.5 }}>
                    {offset > 0 && verse.number <= offset
                      ? 'The psalm’s title, which the King James prints above the psalm rather than as a verse.'
                      : 'The King James numbers this verse differently.'}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
