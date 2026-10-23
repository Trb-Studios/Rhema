import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Subject } from '../lib/marks';
import { allSubjects, nameOfId } from '../lib/marks';
import { popoverVariants, transition } from '../lib/motion';

export type Anchored = {
  /** Everyone the word could stand for here; nearly always one. */
  ids: string[];
  /** The word as the text prints it, which may be a different spelling of the name. */
  text: string;
  x: number;
  y: number;
};

const WIDTH = 330;

/**
 * The card that opens from a name or place in the text.
 *
 * It names a person, not a name: the build worked out which bearer of a shared name each
 * verse means, so this never has to hedge about which Mary. Where the data gives a
 * family it is shown, and the relatives are themselves openable, which is the genealogy.
 */
export function MarkPopover({
  anchored,
  onClose,
  onOpenVerse,
}: {
  anchored: Anchored | null;
  onClose: () => void;
  onOpenVerse: (bookId: number, chapter: number) => void;
}) {
  const [subjects, setSubjects] = useState<Map<string, Subject> | null>(null);
  const [showing, setShowing] = useState<string | null>(null);

  useEffect(() => {
    if (anchored) {
      setShowing(anchored.ids[0] ?? null);
      void allSubjects().then(setSubjects);
    }
  }, [anchored]);

  useEffect(() => {
    if (!anchored) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    // Clicking a mark focuses it, and focusing can scroll the reading pane a little.
    // Closing on that first scroll would shut the card the instant it opened, so the
    // listener starts on the next frame and ignores movement smaller than a line.
    let startedAt = 0;
    let armed = false;
    const onScroll = (event: Event) => {
      const top = (event.target as HTMLElement | null)?.scrollTop ?? window.scrollY;
      if (!armed) {
        startedAt = top;
        return;
      }
      if (Math.abs(top - startedAt) > 24) onClose();
    };

    const frame = requestAnimationFrame(() => {
      armed = true;
    });
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchored, onClose]);

  const subject = showing ? subjects?.get(showing) : undefined;
  const person = subject ? subject.kind === 'person' : true;
  const label = subject?.name ?? (showing ? nameOfId(showing) : '');

  return (
    <AnimatePresence>
      {anchored && (
        <>
          <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-label={label}
            variants={popoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition('snappy')}
            style={{
              position: 'fixed',
              zIndex: 51,
              left: Math.min(
                Math.max(12, anchored.x - WIDTH / 2),
                Math.max(12, window.innerWidth - WIDTH - 12),
              ),
              top: Math.min(anchored.y + 10, Math.max(12, window.innerHeight - 320)),
              width: WIDTH,
              maxHeight: 340,
              overflowY: 'auto',
              transformOrigin: 'top center',
              padding: 16,
              borderRadius: 'var(--radius-card)',
              background: 'var(--bg-card)',
              border: '1px solid var(--line-default)',
              boxShadow: 'var(--shadow-shell)',
            }}
          >
            <div
              style={{
                font: '600 11px var(--font-ui)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: person ? 'var(--mark-name)' : 'var(--mark-place)',
              }}
            >
              {describe(subject)}
            </div>

            <h3 style={{ fontSize: 20, marginTop: 4 }}>{label}</h3>

            {/* The word on the page, when the text spells the name another way. */}
            {anchored.ids.includes(showing ?? '') &&
              anchored.text.toLowerCase() !== label.toLowerCase() && (
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                  Here called {anchored.text}
                </div>
              )}

            {/* Two people of the same name in one verse. The text does not say which
                occurrence is which, so both are offered rather than one guessed at. */}
            {anchored.ids.length > 1 && subjects && (
              <div
                style={{
                  display: 'grid',
                  gap: 5,
                  marginTop: 10,
                  paddingBottom: 2,
                }}
              >
                <span style={{ color: 'var(--text-faint)', fontSize: 11.5 }}>
                  Two of this name stand here. Which one?
                </span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {anchored.ids.map((id) => (
                    <button
                      key={id}
                      onClick={() => setShowing(id)}
                      aria-pressed={showing === id}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        border: `1px solid ${
                          showing === id ? 'var(--main-fill)' : 'var(--line-default)'
                        }`,
                        background: showing === id ? 'var(--main-fill)' : 'transparent',
                        color: showing === id ? 'var(--main-on)' : 'var(--text-secondary)',
                      }}
                    >
                      {subjects.get(id)?.name ?? nameOfId(id)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!subjects ? (
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-faint)' }}>Looking…</p>
            ) : !subject ? (
              <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55 }}>
                Named in Scripture, but nothing more is recorded here.
              </p>
            ) : (
              <>
                {subject.summary && (
                  <p style={{ marginTop: 9, fontSize: 13, lineHeight: 1.55 }}>{subject.summary}</p>
                )}

                {subject.tribe && <Row label="Tribe" value={subject.tribe} />}
                {subject.area && <Row label="Region" value={subject.area} />}
                {subject.near && subject.near !== subject.name && (
                  <Row label="Also known" value={subject.near} />
                )}

                <Family subject={subject} subjects={subjects} onOpen={setShowing} />

                <Appearances subject={subject} onOpenVerse={onOpenVerse} />
              </>
            )}

            {!anchored.ids.includes(showing ?? '') && (
              <button
                onClick={() => setShowing(anchored.ids[0] ?? null)}
                style={{
                  marginTop: 12,
                  color: 'var(--text-secondary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                ← Back to {anchored.text}
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** What kind of thing this is, in a word a reader would use. */
function describe(subject: Subject | undefined): string {
  if (!subject) return 'Name';
  if (subject.kind === 'place') return 'Place';
  if (subject.type === 'Group') return 'People';
  if (subject.type === 'Supernatural') return 'Divine or spiritual';
  if (subject.type === 'Male' || subject.type === 'Female') return 'Person';
  return subject.type || 'Person';
}

function Family({
  subject,
  subjects,
  onOpen,
}: {
  subject: Subject;
  subjects: Map<string, Subject>;
  onOpen: (id: string) => void;
}) {
  const groups: Array<[string, string[]]> = [
    ['Parents', subject.parents],
    ['Siblings', subject.siblings],
    [subject.type === 'Female' ? 'Husband' : 'Wife', subject.partners],
    ['Children', subject.children],
  ];

  const any = groups.some(([, list]) => list.length > 0);
  if (!any) return null;

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: '1px solid var(--line-default)',
        display: 'grid',
        gap: 7,
      }}
    >
      {groups.map(([label, list]) =>
        list.length === 0 ? null : (
          <div key={label} style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 58, flex: 'none', color: 'var(--text-faint)' }}>{label}</span>
            <span style={{ flex: 1, lineHeight: 1.5 }}>
              {list.map((id, index) => {
                const known = subjects.has(id);
                return (
                  <span key={id}>
                    {index > 0 && ', '}
                    {known ? (
                      <button
                        onClick={() => onOpen(id)}
                        style={{
                          font: 'inherit',
                          color: 'var(--mark-name)',
                          fontWeight: 600,
                        }}
                      >
                        {subjects.get(id)!.name}
                      </button>
                    ) : (
                      // Someone the text refers to without naming, such as a wife known
                      // only as her husband's. Shown, but nothing to open.
                      <span style={{ color: 'var(--text-secondary)' }}>{nameOfId(id)}</span>
                    )}
                  </span>
                );
              })}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

function Appearances({
  subject,
  onOpenVerse,
}: {
  subject: Subject;
  onOpenVerse: (bookId: number, chapter: number) => void;
}) {
  if (subject.total === 0) return null;

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line-default)' }}>
      <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>
        Named in <span className="tabular">{subject.total}</span>{' '}
        {subject.total === 1 ? 'verse' : 'verses'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
        {subject.where.slice(0, 8).map(([bookId, chapter, verse]) => (
          <button
            key={`${bookId}:${chapter}:${verse}`}
            onClick={() => onOpenVerse(bookId, chapter)}
            className="tabular"
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid var(--line-default)',
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            {chapter}:{verse}
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 7, fontSize: 12.5 }}>
      <span style={{ width: 58, flex: 'none', color: 'var(--text-faint)' }}>{label}</span>
      <span style={{ flex: 1, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}
