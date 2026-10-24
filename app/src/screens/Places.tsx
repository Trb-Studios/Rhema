import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { books as loadBooks } from '../lib/bible';
import type { Subject } from '../lib/marks';
import { allSubjects } from '../lib/marks';
import type { PlaceProfile, Profiles } from '../lib/profiles';
import { loadProfiles, titleHint } from '../lib/profiles';
import { fold, searchSubjects } from '../lib/people';
import type { Route } from '../lib/nav';
import { navigate, replaceRoute } from '../lib/nav';
import { spring, transition } from '../lib/motion';
import { ScreenHeader } from '../components/ScreenHeader';
import { Chip, Credit, Picture, Section, VerseChips } from '../components/ProfileParts';
import { BookIcon, GlobeIcon, PlaceIcon, SearchIcon } from '../components/Icons';

type Filter = 'all' | 'towns' | 'regions' | 'mountains' | 'water' | 'photos';

const FILTERS: Array<[Filter, string]> = [
  ['all', 'Everywhere'],
  ['towns', 'Towns'],
  ['regions', 'Regions'],
  ['mountains', 'Mountains'],
  ['water', 'Water'],
  ['photos', 'With photos'],
];

function kindMatches(kind: string | undefined, filter: Filter): boolean {
  const value = (kind ?? '').toLowerCase();
  if (filter === 'towns') return /settlement|city|town|village/.test(value);
  if (filter === 'regions') return /region|territory|area|land|country|district/.test(value);
  if (filter === 'mountains') return /mountain|hill|mount|peak|ridge/.test(value);
  if (filter === 'water') return /river|sea|spring|water|well|lake|pool|stream|brook/.test(value);
  return true;
}

/**
 * Every place in Scripture: where it is now, how sure anyone is, what lies near it, and
 * what it looks like today.
 */
export function Places({ route }: { route: Route }) {
  const [subjects, setSubjects] = useState<Map<string, Subject> | null>(null);
  const [profiles, setProfiles] = useState<Profiles | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(route.subject ?? null);
  const detail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void allSubjects().then(setSubjects);
    void loadProfiles().then(setProfiles);
    void loadBooks()
      .then(setBooks)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (route.subject) setSelected(route.subject);
  }, [route.nonce, route.subject]);

  const select = (id: string) => {
    setSelected(id);
    replaceRoute({ screen: 'places', subject: id });
    detail.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const results = useMemo(() => {
    if (!subjects) return [];
    const places = [...subjects.values()].filter((subject) => {
      if (subject.kind !== 'place') return false;
      const profile = profiles?.places[subject.id];
      if (filter === 'photos') return Boolean(profile?.photo);
      return kindMatches(profile?.kind, filter);
    });
    return searchSubjects(places, query, 'place', query.trim() ? 300 : 200);
  }, [subjects, profiles, query, filter]);

  useEffect(() => {
    if (!selected && results[0]) setSelected(results[0].id);
  }, [results, selected]);

  const place = selected ? subjects?.get(selected) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ScreenHeader
        icon={<PlaceIcon size={15} />}
        crumbs={place ? ['Places', place.name] : ['Places']}
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)',
        }}
      >
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            borderRight: '1px solid var(--line-default)',
          }}
        >
          <div style={{ padding: '14px 14px 10px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                height: 38,
                padding: '0 12px',
                borderRadius: 10,
                background: 'var(--bg-sunken)',
                border: '1px solid var(--line-default)',
                color: 'var(--text-faint)',
              }}
            >
              <SearchIcon size={16} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a place — try Bethel or Jordan"
                style={{
                  flex: 1,
                  border: 0,
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                }}
              />
            </label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              {FILTERS.map(([id, label]) => (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.95 }}
                  transition={spring.snappy}
                  onClick={() => setFilter(id)}
                  aria-pressed={filter === id}
                  style={{
                    height: 26,
                    padding: '0 10px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${filter === id ? 'var(--line-strong)' : 'var(--line-default)'}`,
                    background: filter === id ? 'var(--bg-selected)' : 'transparent',
                    color: filter === id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </motion.button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
            {!subjects && (
              <p style={{ padding: 14, color: 'var(--text-faint)', fontSize: 13 }}>
                Gathering places…
              </p>
            )}
            {subjects && results.length === 0 && (
              <p style={{ padding: 14, color: 'var(--text-faint)', fontSize: 13 }}>
                No place by that name.
              </p>
            )}
            {results.map((entry) => {
              const profile = profiles?.places[entry.id];
              const active = entry.id === selected;
              const namesakes = results.filter(
                (other) => fold(other.name) === fold(entry.name),
              ).length;
              return (
                <motion.button
                  key={entry.id}
                  whileTap={{ scale: 0.985 }}
                  transition={spring.snappy}
                  onClick={() => select(entry.id)}
                  className={active ? undefined : 'row-hover'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    textAlign: 'start',
                    padding: '7px 8px',
                    borderRadius: 9,
                    background: active ? 'var(--bg-selected)' : 'transparent',
                    boxShadow: active ? 'inset 0 1px 0 var(--glass-highlight)' : 'none',
                  }}
                >
                  <Picture
                    image={profile?.photo}
                    name={entry.name}
                    kind="place"
                    size={34}
                    rounded={9}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 13.5 }}>
                      {entry.name}
                      {namesakes > 1 && (
                        <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>
                          {' '}
                          · {titleHint(profile?.title) || 'one of several'}
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: 'var(--text-faint)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {profile?.modern ? `Today: ${profile.modern.name}` : entry.area || ' '}
                    </span>
                  </span>
                  <span className="tabular" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {entry.total}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </aside>

        <div ref={detail} style={{ minHeight: 0, overflowY: 'auto' }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {place && subjects && (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={transition('smooth')}
              >
                <PlaceView
                  place={place}
                  subjects={subjects}
                  profiles={profiles}
                  books={books}
                  onOpen={select}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const CONFIDENCE_TONE = {
  'very likely': 'good',
  likely: 'good',
  possible: 'warn',
  uncertain: 'warn',
} as const;

function PlaceView({
  place,
  subjects,
  profiles,
  books,
  onOpen,
}: {
  place: Subject;
  subjects: Map<string, Subject>;
  profiles: Profiles | null;
  books: Book[];
  onOpen: (id: string) => void;
}) {
  const profile = profiles?.places[place.id];
  const first = place.where[0];
  const firstBook = first ? books.find((book) => book.id === first[0]) : undefined;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px clamp(18px, 4vw, 44px) 72px' }}>
      {/* Photograph across the top, with the name over it. */}
      <div style={{ position: 'relative', height: 280, borderRadius: 20, overflow: 'hidden' }}>
        <Picture image={profile?.photo} name={place.name} kind="place" size="100%" rounded={20} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: profile?.photo
              ? 'linear-gradient(180deg, transparent 35%, rgba(5,5,7,0.85))'
              : 'none',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 20,
            color: profile?.photo ? '#f3efe7' : 'var(--text-primary)',
          }}
        >
          <div
            className="eyebrow"
            style={{ color: profile?.photo ? 'rgba(243,239,231,0.75)' : 'var(--mark-place)' }}
          >
            {profile?.kind
              ? profile.kind.replace(/^\w/, (letter) => letter.toUpperCase())
              : 'Place'}
          </div>
          <h1 style={{ fontSize: 46, lineHeight: 1.05, marginTop: 4 }}>{place.name}</h1>
          {titleHint(profile?.title) && (
            <div style={{ marginTop: 4, fontSize: 14, opacity: 0.8 }}>
              {titleHint(profile?.title)}
            </div>
          )}
        </div>
      </div>
      {profile?.photo && (
        <div style={{ marginTop: 8 }}>
          <Credit
            image={profile.photo}
            label={profile.photo.description ? profile.photo.description : 'Photograph'}
          />
        </div>
      )}

      {/* Where it is now */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          marginTop: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition('smooth'), delay: 0.04 }}
          style={{
            padding: 18,
            borderRadius: 14,
            border: '1px solid var(--line-default)',
            background: 'var(--bg-card)',
          }}
        >
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlobeIcon size={13} /> Where it is now
          </div>
          {profile?.modern ? (
            <>
              <div style={{ font: '400 26px var(--font-display)', marginTop: 8 }}>
                {profile.modern.name}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                <Chip tone={CONFIDENCE_TONE[profile.modern.confidence]}>
                  Identification {profile.modern.confidence}
                </Chip>
                {profile.modern.type && <Chip>{profile.modern.type}</Chip>}
              </div>
              {profile.modern.precision && (
                <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {profile.modern.precision}
                </p>
              )}
              {profile.alternatives && profile.alternatives.length > 0 && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 12.5,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  Also proposed:{' '}
                  {profile.alternatives.map((alt) => `${alt.name} (${alt.confidence})`).join(', ')}
                </p>
              )}
              {profile.lonlat && (
                <p
                  className="tabular"
                  style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-faint)' }}
                >
                  {Math.abs(profile.lonlat[1]).toFixed(3)}°{profile.lonlat[1] >= 0 ? 'N' : 'S'},{' '}
                  {Math.abs(profile.lonlat[0]).toFixed(3)}°{profile.lonlat[0] >= 0 ? 'E' : 'W'}
                </p>
              )}
            </>
          ) : (
            <p
              style={{
                marginTop: 10,
                fontSize: 13.5,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              No one has identified where this was with any confidence.
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition('smooth'), delay: 0.08 }}
          style={{
            padding: 18,
            borderRadius: 14,
            border: '1px solid var(--line-default)',
            background: 'var(--bg-card)',
          }}
        >
          <div className="eyebrow">In Scripture</div>
          <div style={{ font: '400 26px var(--font-display)', marginTop: 8 }}>
            {place.total.toLocaleString()} {place.total === 1 ? 'verse' : 'verses'}
          </div>
          {profile?.fromJerusalem && (
            <p style={{ marginTop: 8, fontSize: 13.5, color: 'var(--text-secondary)' }}>
              About {profile.fromJerusalem.km.toLocaleString()} km {profile.fromJerusalem.dir} of
              Jerusalem
            </p>
          )}
          {first && firstBook && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              onClick={() =>
                navigate({ screen: 'read', bookId: first[0], chapter: first[1], verse: first[2] })
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                marginTop: 12,
                height: 32,
                padding: '0 12px',
                borderRadius: 9,
                background: 'var(--main-fill)',
                color: 'var(--main-on)',
                fontWeight: 650,
                fontSize: 12.5,
              }}
            >
              <BookIcon size={14} />
              First named in {firstBook.name} {first[1]}:{first[2]}
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Its neighbours */}
      {profile?.near && profile.near.length > 0 && profile.lonlat && profiles && (
        <Section
          title="Around it"
          aside="Biblical places nearest, by straight-line distance"
          delay={0.1}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
              gap: 14,
              alignItems: 'stretch',
            }}
          >
            <NeighbourMap
              place={place}
              profile={profile}
              profiles={profiles}
              subjects={subjects}
              onOpen={onOpen}
            />
            <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
              {profile.near.map((near, index) => (
                <motion.button
                  key={near.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...transition('smooth'), delay: 0.12 + index * 0.03 }}
                  whileHover={{ x: 2 }}
                  onClick={() => onOpen(near.id)}
                  className="row-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--line-default)',
                    textAlign: 'start',
                  }}
                >
                  <span style={{ color: 'var(--mark-place)', display: 'grid' }}>
                    <PlaceIcon size={15} />
                  </span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>
                    {subjects.get(near.id)?.name ?? near.id.split('@')[0]}
                  </span>
                  <span
                    className="tabular"
                    style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                  >
                    {near.km < 10 ? near.km.toFixed(1) : Math.round(near.km)} km {near.dir}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </Section>
      )}

      {profile?.bio && profile.bio.length > 0 && (
        <Section title="About the place" aside="Easton's Bible Dictionary, 1897" delay={0.14}>
          <div style={{ display: 'grid', gap: 12 }}>
            {profile.bio.map((paragraph, index) => (
              <p
                key={index}
                style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.7 }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </Section>
      )}

      {place.total > 0 && (
        <Section
          title="Where it appears"
          aside={
            place.total > place.where.length
              ? `first ${place.where.length} of ${place.total}`
              : undefined
          }
          delay={0.18}
        >
          <VerseChips where={place.where} books={books} />
        </Section>
      )}
    </div>
  );
}

/**
 * The place and its neighbours plotted to scale, north up, with Jerusalem marked when
 * it falls in the frame. Not a map of coastlines — a sense of how the places sit
 * relative to one another, which is what a reader following a journey needs.
 */
function NeighbourMap({
  place,
  profile,
  profiles,
  subjects,
  onOpen,
}: {
  place: Subject;
  profile: PlaceProfile;
  profiles: Profiles;
  subjects: Map<string, Subject>;
  onOpen: (id: string) => void;
}) {
  const centre = profile.lonlat!;
  const points = (profile.near ?? [])
    .map((near) => ({ id: near.id, at: profiles.places[near.id]?.lonlat }))
    .filter((point): point is { id: string; at: [number, number] } => Boolean(point.at));

  const jerusalemId = [...subjects.values()].find(
    (subject) => subject.kind === 'place' && subject.name === 'Jerusalem',
  )?.id;
  const jerusalem = jerusalemId ? profiles.places[jerusalemId]?.lonlat : undefined;

  // Equirectangular around the place, scaled so the farthest neighbour sits near the edge.
  const cos = Math.cos((centre[1] * Math.PI) / 180);
  const project = ([lon, lat]: [number, number]) =>
    [(lon - centre[0]) * cos, lat - centre[1]] as const;
  const reach = Math.max(0.02, ...points.map((point) => Math.hypot(...project(point.at))));
  const size = 300;
  const scale = (size / 2 - 34) / reach;
  const toScreen = (at: [number, number]) => {
    const [x, y] = project(at);
    return [size / 2 + x * scale, size / 2 - y * scale] as const;
  };
  const jerusalemPoint = jerusalem && jerusalemId !== place.id ? toScreen(jerusalem) : null;

  // Labels are placed one at a time, each moved below its point, then further out, when
  // it would overlap one already placed. Places at the same site would otherwise print
  // their names on top of each other.
  const placed: Array<{ x: number; y: number; w: number }> = [
    { x: size / 2, y: size / 2 + 22, w: place.name.length * 6.6 },
  ];
  const labels = new Map<string, { x: number; y: number }>();
  for (const point of points) {
    const [x, y] = toScreen(point.at);
    const name = subjects.get(point.id)?.name ?? point.id.split('@')[0];
    const w = name.length * 5.9;
    const tries = [y - 9, y + 17, y - 22, y + 30, y - 35, y + 43];
    const clear = (ty: number) =>
      placed.every(
        (other) => Math.abs(other.y - ty) > 12 || Math.abs(other.x - x) > (other.w + w) / 2 + 4,
      );
    const ty = tries.find(clear) ?? tries[0];
    placed.push({ x, y: ty, w });
    labels.set(point.id, { x, y: ty });
  }
  const jerusalemInFrame =
    jerusalemPoint &&
    jerusalemPoint[0] > 8 &&
    jerusalemPoint[0] < size - 8 &&
    jerusalemPoint[1] > 8 &&
    jerusalemPoint[1] < size - 8;

  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--line-default)',
        background: 'var(--bg-card)',
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        <defs>
          <radialGradient id="map-glow">
            <stop offset="0%" stopColor="var(--mark-place)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--mark-place)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[0.33, 0.66, 1].map((ring) => (
          <circle
            key={ring}
            cx={size / 2}
            cy={size / 2}
            r={(size / 2 - 34) * ring}
            fill="none"
            stroke="var(--line-default)"
            strokeDasharray="2 4"
          />
        ))}
        <text
          x={size / 2}
          y={14}
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="var(--text-faint)"
        >
          N
        </text>
        <circle cx={size / 2} cy={size / 2} r={40} fill="url(#map-glow)" />
        {points.map((point, index) => {
          const [x, y] = toScreen(point.at);
          return (
            <motion.g
              key={point.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 + index * 0.05, duration: 0.3 }}
              style={{ cursor: 'default' }}
              onClick={() => onOpen(point.id)}
            >
              <line
                x1={size / 2}
                y1={size / 2}
                x2={x}
                y2={y}
                stroke="var(--line-strong)"
                strokeWidth="1"
              />
              <circle
                cx={x}
                cy={y}
                r={4.5}
                fill="var(--bg-card)"
                stroke="var(--mark-place)"
                strokeWidth="1.6"
              />
              <text
                x={labels.get(point.id)?.x ?? x}
                y={labels.get(point.id)?.y ?? y - 9}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="600"
                fill="var(--text-secondary)"
                stroke="var(--bg-card)"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {subjects.get(point.id)?.name ?? point.id.split('@')[0]}
              </text>
            </motion.g>
          );
        })}
        {jerusalemInFrame && jerusalemPoint && (
          <g>
            <rect
              x={jerusalemPoint[0] - 4}
              y={jerusalemPoint[1] - 4}
              width={8}
              height={8}
              rotate={45}
              fill="var(--main-fill)"
            />
            <text
              x={jerusalemPoint[0]}
              y={jerusalemPoint[1] + 16}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="var(--text-tan)"
            >
              Jerusalem
            </text>
          </g>
        )}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={7}
          fill="var(--mark-place)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={spring.bouncy}
        />
        <text
          x={size / 2}
          y={size / 2 + 22}
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="var(--text-primary)"
        >
          {place.name}
        </text>
      </svg>
    </div>
  );
}
