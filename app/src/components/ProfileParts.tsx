import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import type { Dispute, Portrait } from '../lib/profiles';
import { mediaUrl, parseRef } from '../lib/profiles';
import { navigate } from '../lib/nav';
import { spring, transition } from '../lib/motion';
import { PersonIcon, PlaceIcon, SparkleIcon } from './Icons';

/**
 * A portrait, or an honest blank where none exists.
 *
 * Most people in Scripture were never painted. Rather than a stock face that would look
 * like a likeness, they get a quiet card that says so.
 */
export function Picture({
  image,
  name,
  kind,
  size,
  rounded = 16,
}: {
  image?: Portrait;
  name: string;
  kind: 'person' | 'place';
  size: number | '100%';
  rounded?: number;
}) {
  const [failed, setFailed] = useState(false);
  const box: React.CSSProperties = {
    width: size,
    height: size === '100%' ? '100%' : size,
    borderRadius: rounded,
    overflow: 'hidden',
    flex: 'none',
    position: 'relative',
  };

  if (image && !failed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={transition('smooth')}
        style={{ ...box, background: 'var(--bg-sunken)', boxShadow: 'var(--shadow-raised)' }}
      >
        <img
          src={mediaUrl(image.file)}
          alt={kind === 'person' ? `${name}, as painted` : name}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </motion.div>
    );
  }

  const small = typeof size === 'number' && size < 64;
  return (
    <div
      style={{
        ...box,
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(120% 90% at 30% 10%, color-mix(in srgb, var(--main-fill) 14%, var(--bg-sunken)), var(--bg-sunken))',
        border: '1px solid var(--line-default)',
        color: 'var(--text-faint)',
      }}
      aria-label={kind === 'person' ? 'No portrait known' : 'No photograph'}
    >
      {small ? (
        <span style={{ font: `500 ${Math.round((size as number) * 0.42)}px var(--font-display)`, color: 'var(--text-secondary)' }}>
          {name.slice(0, 1)}
        </span>
      ) : (
        <div style={{ display: 'grid', justifyItems: 'center', gap: 10, padding: 16, textAlign: 'center' }}>
          <span style={{ opacity: 0.55 }}>
            {kind === 'person' ? <PersonIcon size={44} /> : <PlaceIcon size={44} />}
          </span>
          <span style={{ font: '600 11px var(--font-ui)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {kind === 'person' ? 'No portrait known' : 'No photograph'}
          </span>
        </div>
      )}
    </div>
  );
}

export function Section({
  title,
  aside,
  children,
  delay = 0,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition('smooth'), delay }}
      style={{ marginTop: 28 }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <h3 className="eyebrow" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
          {title}
        </h3>
        {aside && <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-faint)' }}>{aside}</span>}
      </div>
      {children}
    </motion.section>
  );
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'name' | 'place' | 'good' | 'warn' }) {
  const colours = {
    name: ['var(--mark-name-tint)', 'var(--mark-name)'],
    place: ['var(--mark-place-tint)', 'var(--mark-place)'],
    good: ['var(--status-done-bg)', 'var(--status-done-text)'],
    warn: ['var(--status-pending-bg)', 'var(--status-pending-text)'],
  } as const;
  const [bg, fg] = tone ? colours[tone] : ['var(--bg-sunken)', 'var(--text-secondary)'];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 24,
        padding: '0 10px',
        borderRadius: 99,
        background: bg,
        color: fg,
        font: '600 11.5px var(--font-ui)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** Verses as small buttons, grouped by book, each opening the reader there. */
export function VerseChips({
  where,
  books,
  limit = 60,
}: {
  where: Array<[number, number, number]>;
  books: Book[];
  limit?: number;
}) {
  const groups = new Map<number, Array<[number, number, number]>>();
  for (const ref of where.slice(0, limit)) {
    const list = groups.get(ref[0]) ?? [];
    list.push(ref);
    groups.set(ref[0], list);
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {[...groups.entries()].map(([bookId, refs]) => {
        const book = books.find((candidate) => candidate.id === bookId);
        return (
          <div key={bookId} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span style={{ width: 110, flex: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {book?.name ?? `Book ${bookId}`}
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {refs.map(([, chapter, verse]) => (
                <motion.button
                  key={`${chapter}:${verse}`}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={spring.snappy}
                  onClick={() => navigate({ screen: 'read', bookId, chapter, verse })}
                  className="tabular row-hover"
                  style={{
                    height: 24,
                    padding: '0 8px',
                    borderRadius: 6,
                    border: '1px solid var(--line-default)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {chapter}:{verse}
                </motion.button>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** A note on a disputed identification. Written with AI help, so it carries the sparkle. */
export function DisputeCard({
  dispute,
  books,
  nameOf,
  onOpenPerson,
  current,
}: {
  dispute: Dispute;
  books: Book[];
  nameOf: (id: string) => string;
  onOpenPerson: (id: string) => void;
  current: string;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--ai-sparkle) 30%, var(--line-default))',
        background: 'color-mix(in srgb, var(--ai-sparkle) 5%, var(--bg-card))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ marginTop: 2 }}>
          <SparkleIcon size={15} title="Written with AI" />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 650, fontSize: 14 }}>{dispute.title}</div>
          <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-secondary)' }}>{dispute.note}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {dispute.people
              .filter((id) => id !== current)
              .map((id) => (
                <button
                  key={id}
                  onClick={() => onOpenPerson(id)}
                  className="row-hover"
                  style={{
                    height: 24,
                    padding: '0 9px',
                    borderRadius: 99,
                    border: '1px solid var(--line-default)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--mark-name)',
                  }}
                >
                  {nameOf(id)}
                </button>
              ))}
            {dispute.refs.map((ref) => {
              const at = parseRef(ref);
              const book = at ? books.find((candidate) => candidate.id === at.bookId) : undefined;
              if (!at || !book) return null;
              return (
                <button
                  key={ref}
                  onClick={() => navigate({ screen: 'read', ...at })}
                  className="tabular row-hover"
                  style={{
                    height: 24,
                    padding: '0 8px',
                    borderRadius: 6,
                    border: '1px solid var(--line-default)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--text-tan)',
                  }}
                >
                  {book.abbreviation} {at.chapter}:{at.verse}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-faint)' }}>
            Written with AI and checked against the verses cited. Read them before relying on it.
          </div>
        </div>
      </div>
    </div>
  );
}

export function Credit({ image, label }: { image: Portrait; label: string }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5 }}>
      {label}: {image.credit} · {image.licence}
      {image.source ? ' · Wikimedia Commons' : ''}
    </div>
  );
}
