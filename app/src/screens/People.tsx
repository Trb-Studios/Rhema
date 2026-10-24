import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { books as loadBooks } from '../lib/bible';
import type { Relative, Subject } from '../lib/marks';
import { allSubjects, nameOfId } from '../lib/marks';
import type { Profiles } from '../lib/profiles';
import { loadProfiles, titleHint, yearLabel } from '../lib/profiles';
import { descriptorOf, fold, namesakes, searchSubjects, withEverydayNames } from '../lib/people';
import type { Route } from '../lib/nav';
import { navigate, replaceRoute } from '../lib/nav';
import { spring, transition } from '../lib/motion';
import { ScreenHeader } from '../components/ScreenHeader';
import { Chip, Credit, DisputeCard, Picture, Section, VerseChips } from '../components/ProfileParts';
import { BookIcon, PeopleIcon, SearchIcon } from '../components/Icons';

type Filter = 'all' | 'men' | 'women' | 'groups' | 'portraits';

const FILTERS: Array<[Filter, string]> = [
  ['all', 'Everyone'],
  ['men', 'Men'],
  ['women', 'Women'],
  ['groups', 'Peoples'],
  ['portraits', 'With portraits'],
];

/**
 * Everyone in Scripture, searchable, each with a profile.
 *
 * Searching a name lists every individual who bore it, each with the words that tell
 * them apart, so "James" shows the son of Zebedee, the son of Alphaeus and the brother
 * of Jesus as three people rather than one. Where Scripture leaves open whether two
 * names are one person, the profile says so and shows the verses either way.
 */
export function People({ route }: { route: Route }) {
  const [rawSubjects, setSubjects] = useState<Map<string, Subject> | null>(null);
  const [profiles, setProfiles] = useState<Profiles | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(route.subject ?? null);
  const detail = useRef<HTMLDivElement>(null);
  const subjects = useMemo(
    () => (rawSubjects ? withEverydayNames(rawSubjects, profiles) : null),
    [rawSubjects, profiles],
  );

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

  // The selection is kept in the route so Back returns to it.
  const select = (id: string) => {
    setSelected(id);
    replaceRoute({ screen: 'people', subject: id });
    detail.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const titleOf = (id: string) => profiles?.people[id]?.title;
  const describe = (subject: Subject) =>
    titleHint(titleOf(subject.id), subject.name) || (subjects ? descriptorOf(subject, subjects, books) : '');

  const results = useMemo(() => {
    if (!subjects) return [];
    const people = [...subjects.values()].filter((subject) => subject.kind === 'person');
    const passes = (subject: Subject) => {
      if (filter === 'men') return subject.type === 'Male';
      if (filter === 'women') return subject.type === 'Female';
      if (filter === 'groups') return subject.type === 'Group';
      if (filter === 'portraits') return Boolean(profiles?.people[subject.id]?.portrait);
      return subject.type !== 'Group';
    };
    const found = searchSubjects(people.filter(passes), query, 'person', query.trim() ? 300 : 200);
    // Namesakes sit together under their shared name, in the order the name first ranks.
    const groups = new Map<string, Subject[]>();
    for (const subject of found) {
      const key = fold(subject.name);
      const list = groups.get(key) ?? [];
      list.push(subject);
      groups.set(key, list);
    }
    return [...groups.values()];
  }, [subjects, query, filter, profiles]);

  const subject = selected ? subjects?.get(selected) : undefined;

  // A new search moves the selection to its first result, unless what is open is in it.
  useEffect(() => {
    const flat = results.flat();
    if (flat.length === 0) return;
    if (!selected || (query.trim() && !flat.some((person) => person.id === selected))) {
      setSelected(flat[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ScreenHeader
        icon={<PeopleIcon size={15} />}
        crumbs={subject ? ['People', subject.name] : ['People']}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)' }}>
        {/* List */}
        <aside style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--line-default)' }}>
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
                placeholder="Search any name — try James or Mary"
                style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text-primary)' }}
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
            {!subjects && <p style={{ padding: 14, color: 'var(--text-faint)', fontSize: 13 }}>Gathering everyone…</p>}
            {subjects && results.length === 0 && (
              <p style={{ padding: 14, color: 'var(--text-faint)', fontSize: 13 }}>No one by that name.</p>
            )}
            {results.map((group, groupIndex) => (
              <div key={fold(group[0].name) + groupIndex} style={{ marginTop: group.length > 1 ? 8 : 0 }}>
                {group.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 8px 4px',
                      fontSize: 11.5,
                      color: 'var(--text-faint)',
                    }}
                  >
                    <span style={{ fontWeight: 650, color: 'var(--text-secondary)' }}>{group[0].name}</span>
                    <span>· {group.length} different people</span>
                  </div>
                )}
                {group.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    descriptor={describe(person)}
                    active={person.id === selected}
                    profiles={profiles}
                    indent={group.length > 1}
                    onClick={() => select(person.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Profile */}
        <div ref={detail} style={{ minHeight: 0, overflowY: 'auto' }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {subject && subjects && (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={transition('smooth')}
              >
                <PersonProfileView
                  person={subject}
                  subjects={subjects}
                  profiles={profiles}
                  books={books}
                  describe={describe}
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

function PersonRow({
  person,
  descriptor,
  active,
  profiles,
  indent,
  onClick,
}: {
  person: Subject;
  descriptor: string;
  active: boolean;
  profiles: Profiles | null;
  indent: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      transition={spring.snappy}
      onClick={onClick}
      aria-current={active}
      className={active ? undefined : 'row-hover'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        textAlign: 'start',
        padding: indent ? '7px 8px 7px 14px' : '7px 8px',
        borderRadius: 9,
        background: active ? 'var(--bg-selected)' : 'transparent',
        boxShadow: active ? 'inset 0 1px 0 var(--glass-highlight)' : 'none',
      }}
    >
      <Picture image={profiles?.people[person.id]?.portrait} name={person.name} kind="person" size={34} rounded={9} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 13.5 }}>{person.name}</span>
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
          {descriptor || ' '}
        </span>
      </span>
      <span className="tabular" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
        {person.total}
      </span>
    </motion.button>
  );
}

function PersonProfileView({
  person,
  subjects,
  profiles,
  books,
  describe,
  onOpen,
}: {
  person: Subject;
  subjects: Map<string, Subject>;
  profiles: Profiles | null;
  books: Book[];
  describe: (subject: Subject) => string;
  onOpen: (id: string) => void;
}) {
  const profile = profiles?.people[person.id];
  const others = namesakes(subjects, person).filter((other) => other.id !== person.id);
  const disputes = profiles?.disputes.filter((dispute) => dispute.people.includes(person.id)) ?? [];
  const first = person.where[0];
  const firstBook = first ? books.find((book) => book.id === first[0]) : undefined;
  const nameOf = (id: string) => subjects.get(id)?.name ?? nameOfId(id);
  const label =
    person.type === 'Group' ? 'People' : person.type === 'Supernatural' ? 'Divine or spiritual' : 'Person';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px clamp(18px, 4vw, 44px) 72px' }}>
      {/* Hero */}
      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Picture image={profile?.portrait} name={person.name} kind="person" size={196} rounded={20} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="eyebrow" style={{ color: 'var(--mark-name)' }}>
            {label}
          </div>
          <h1 style={{ fontSize: 46, lineHeight: 1.05, marginTop: 6 }}>{person.name}</h1>
          <div style={{ marginTop: 6, fontSize: 15, color: 'var(--text-secondary)' }}>{describe(person)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
            {person.type === 'Male' && <Chip>Man</Chip>}
            {person.type === 'Female' && <Chip>Woman</Chip>}
            {person.tribe && <Chip>{person.tribe}</Chip>}
            <Chip tone="name">
              Named in {person.total.toLocaleString()} {person.total === 1 ? 'verse' : 'verses'}
            </Chip>
            {(profile?.born !== undefined || profile?.died !== undefined) && (
              <Chip tone="warn">
                {profile?.born !== undefined ? `c. ${yearLabel(profile.born)}` : '?'} –{' '}
                {profile?.died !== undefined ? `c. ${yearLabel(profile.died)}` : '?'}
              </Chip>
            )}
          </div>
          {first && firstBook && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              onClick={() => navigate({ screen: 'read', bookId: first[0], chapter: first[1], verse: first[2] })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                marginTop: 16,
                height: 34,
                padding: '0 14px',
                borderRadius: 9,
                background: 'var(--main-fill)',
                color: 'var(--main-on)',
                fontWeight: 650,
                fontSize: 13,
              }}
            >
              <BookIcon size={15} />
              First named in {firstBook.name} {first[1]}:{first[2]}
            </motion.button>
          )}
        </div>
      </div>
      {profile?.portrait && (
        <div style={{ marginTop: 10 }}>
          <Credit image={profile.portrait} label="Portrait" />
        </div>
      )}

      {/* Same name, different person */}
      {(others.length > 0 || disputes.length > 0) && (
        <Section title="Same name, different people" aside={others.length ? `${others.length + 1} called ${person.name}` : undefined} delay={0.04}>
          {others.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
              {others.slice(0, 12).map((other) => {
                const at = other.where[0];
                const book = at ? books.find((candidate) => candidate.id === at[0]) : undefined;
                return (
                  <motion.button
                    key={other.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={spring.snappy}
                    onClick={() => onOpen(other.id)}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      textAlign: 'start',
                      padding: 10,
                      borderRadius: 12,
                      border: '1px solid var(--line-default)',
                      background: 'var(--bg-card)',
                    }}
                  >
                    <Picture image={profiles?.people[other.id]?.portrait} name={other.name} kind="person" size={38} rounded={10} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 650, fontSize: 13 }}>
                        {other.name} <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>· {describe(other) || 'no other detail'}</span>
                      </span>
                      <span className="tabular" style={{ display: 'block', fontSize: 11.5, color: 'var(--text-faint)' }}>
                        {book && at ? `${book.name} ${at[1]}:${at[2]}` : ''} · {other.total} {other.total === 1 ? 'verse' : 'verses'}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
          {disputes.length > 0 && (
            <div style={{ display: 'grid', gap: 10, marginTop: others.length ? 12 : 0 }}>
              {disputes.map((dispute) => (
                <DisputeCard
                  key={dispute.id}
                  dispute={dispute}
                  books={books}
                  nameOf={nameOf}
                  onOpenPerson={onOpen}
                  current={person.id}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Easton's */}
      {profile?.bio && profile.bio.length > 0 && (
        <Section title="Who they were" aside="Easton's Bible Dictionary, 1897" delay={0.08}>
          <div style={{ display: 'grid', gap: 12 }}>
            {profile.bio.map((paragraph, index) => (
              <p key={index} style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.7 }}>
                {paragraph}
              </p>
            ))}
          </div>
          {profile.aka && profile.aka.length > 0 && (
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              Also called {profile.aka.join(', ')}.
            </p>
          )}
        </Section>
      )}
      {!profile?.bio && person.summary && (
        <Section title="Who they were" delay={0.08}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.7 }}>{person.summary}</p>
        </Section>
      )}

      {/* Family */}
      <FamilyTree person={person} subjects={subjects} profiles={profiles} onOpen={onOpen} />

      {/* Where they appear */}
      {person.total > 0 && (
        <Section
          title="Where they appear"
          aside={person.total > person.where.length ? `first ${person.where.length} of ${person.total}` : undefined}
          delay={0.16}
        >
          <VerseChips where={person.where} books={books} />
        </Section>
      )}
    </div>
  );
}

/** Three generations: parents above, the person with siblings and spouses, children below. */
function FamilyTree({
  person,
  subjects,
  profiles,
  onOpen,
}: {
  person: Subject;
  subjects: Map<string, Subject>;
  profiles: Profiles | null;
  onOpen: (id: string) => void;
}) {
  const rows: Array<[string, Relative[]]> = [
    ['Parents', person.parents],
    [person.type === 'Female' ? 'Husband' : 'Wives and partners', person.partners],
    ['Brothers and sisters', person.siblings],
    ['Children', person.children],
  ];
  if (rows.every(([, list]) => list.length === 0)) return null;

  return (
    <Section title="Family" delay={0.12}>
      <div
        style={{
          display: 'grid',
          gap: 14,
          padding: 16,
          borderRadius: 14,
          border: '1px solid var(--line-default)',
          background: 'var(--bg-card)',
        }}
      >
        {rows.map(([label, list]) =>
          list.length === 0 ? null : (
            <div key={label}>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 6 }}>{label}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {list.slice(0, 24).map(({ id, note }, index) => {
                  const known = subjects.get(id);
                  return (
                    <motion.button
                      key={id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...spring.snappy, delay: Math.min(index * 0.02, 0.3) }}
                      whileHover={known ? { y: -2 } : undefined}
                      disabled={!known}
                      onClick={() => known && onOpen(id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        height: 34,
                        padding: '0 10px 0 4px',
                        borderRadius: 99,
                        border: '1px solid var(--line-default)',
                        background: 'var(--bg-sunken)',
                        color: known ? 'var(--text-primary)' : 'var(--text-faint)',
                        fontSize: 12.5,
                        fontWeight: 600,
                      }}
                    >
                      <Picture image={profiles?.people[id]?.portrait} name={known?.name ?? nameOfId(id)} kind="person" size={26} rounded={99} />
                      {known?.name ?? nameOfId(id)}
                      {note && <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 500 }}>({note})</span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ),
        )}
      </div>
    </Section>
  );
}
