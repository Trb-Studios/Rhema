/**
 * Profiles for people and places: who they were, where a place is now, and a picture.
 *
 * The reader already knows every individual in Scripture and every verse naming them,
 * from TIPNR. This adds the rest of a profile, from three sources, each matched to the
 * individual by the verses they share rather than by name alone — there are thirty
 * Zechariahs, and a name match would hand all of them the prophet's biography.
 *
 *  - Theographic Bible Metadata (CC BY-SA 4.0): for each person, the paragraph of
 *    Easton's Bible Dictionary (1897, public domain) about that individual, a
 *    disambiguated title such as "James (Son of Zebedee)", other names, and estimated
 *    dates; for places, Easton's paragraph about the place.
 *  - OpenBible.info geocoding (CC BY 4.0): where a place is now, how confident the
 *    identification is, coordinates, and a photograph with its licence.
 *  - Wikidata and Wikimedia Commons: a portrait for well-known people, chosen in
 *    data/portraits.json, taken only where the image is freely licensed.
 *
 * Disputed identifications come from data/identities.json, which is written with AI
 * help and marked as such in the app.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { BOOKS as TIPNR_BOOKS } from './names.mjs';

export const THEOGRAPHIC =
  'https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master/json/';
export const OPENBIBLE =
  'https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data/';

const USER_AGENT = 'RhemaBuild/0.2 (https://github.com/Trb-Studios/Rhema)';

/** OSIS book codes, as Theographic and OpenBible write references, in canonical order. */
export const OSIS = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer',
  'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph',
  'Hag', 'Zech', 'Mal',
  'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phil', 'Col',
  '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1Pet', '2Pet', '1John',
  '2John', '3John', 'Jude', 'Rev',
];
const OSIS_ID = new Map(OSIS.map((code, index) => [code, index + 1]));
const TIPNR_ID = new Map(TIPNR_BOOKS.map((code, index) => [code, index + 1]));

/** "Gen.12.8" to "1:12:8", the key the app uses for a verse. */
export function osisKey(ref) {
  const [book, chapter, verse] = String(ref ?? '').split('.');
  const id = OSIS_ID.get(book) ?? TIPNR_ID.get(book);
  return id && chapter && verse ? `${id}:${Number(chapter)}:${Number(verse)}` : null;
}

/** Lowercase letters only, so "Beth-el", "Bethel" and "Béthel" compare equal. */
export function fold(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/**
 * Easton's text as Theographic stores it is Markdown with every reference a link. The
 * app shows plain text, so links keep their words and lose their targets, and the
 * stray replacement characters from the source's encoding are dropped.
 */
export function plain(markdown) {
  return String(markdown ?? '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/�/g, ' ')
    .replace(/[*_`]/g, '')
    .replace(/\s+([,;.:)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pairs each individual with the record in another dataset that names them in the most
 * of the same verses. One-to-one within a name: once a record is taken by the better
 * match it is not handed to a weaker one as well.
 *
 * Scored by overlap over union. Scoring by overlap over the smaller set let a minor
 * figure win: James the father of Judas is named in two verses, one of which (Acts
 * 1:13) also names James son of Alphaeus, so half his verses "matched" the apostle's
 * record and took it from the apostle himself.
 */
export function matchByVerses(ours, theirs, { minShare = 0.1 } = {}) {
  const byName = new Map();
  for (const candidate of theirs) {
    for (const name of candidate.names) {
      const list = byName.get(name) ?? [];
      list.push(candidate);
      byName.set(name, list);
    }
  }

  const pairs = [];
  for (const mine of ours) {
    for (const candidate of byName.get(fold(mine.name)) ?? []) {
      let shared = 0;
      for (const key of mine.verses) if (candidate.verses.has(key)) shared += 1;
      if (shared === 0) continue;
      const share = shared / Math.max(1, mine.verses.size + candidate.verses.size - shared);
      if (share < minShare) continue;
      pairs.push({ mine, candidate, shared, share });
    }
  }

  pairs.sort((a, b) => b.share - a.share || b.shared - a.shared);
  const taken = new Set();
  const out = new Map();
  for (const { mine, candidate } of pairs) {
    if (out.has(mine.id) || taken.has(candidate.key)) continue;
    out.set(mine.id, candidate);
    taken.add(candidate.key);
  }
  return out;
}

const RADIUS_KM = 6371;
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres between two [lon, lat] points. */
export function distanceKm([lon1, lat1], [lon2, lat2]) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Which way the second point lies from the first, as one of eight compass points. */
export function compass([lon1, lat1], [lon2, lat2]) {
  const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lon2 - lon1));
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][
    Math.round(((bearing + 360) % 360) / 45) % 8
  ];
}

/** How sure OpenBible is of an identification, in words. Its scores run to 1000. */
export function confidenceOf(score) {
  if (score >= 700) return 'very likely';
  if (score >= 400) return 'likely';
  if (score >= 100) return 'possible';
  return 'uncertain';
}

function lonlatOf(text) {
  if (!text) return null;
  const [lon, lat] = String(text).split(',').map(Number);
  return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null;
}

function slugOf(id) {
  return id.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

/**
 * Turns a selector from portraits.json or identities.json into one individual.
 *
 * An exact identifier is used as it stands. "Name" picks the most mentioned bearer of
 * the name; "Name|Book" or "Name|Book12" the bearer first named in that book, or that
 * chapter of it.
 */
export function resolveSelector(selector, people) {
  if (selector.includes('@')) return people.has(selector) ? selector : null;
  const [name, hint] = selector.split('|');
  let candidates = [...people.values()].filter((person) => fold(person.name) === fold(name));
  if (hint) {
    const match = /^([1-3]?[A-Za-z]{2,3})(\d+)?$/.exec(hint);
    if (!match) return null;
    const bookId = TIPNR_ID.get(match[1]);
    const chapter = match[2] ? Number(match[2]) : null;
    candidates = candidates.filter(
      (person) =>
        person.first &&
        person.first[0] === bookId &&
        (chapter === null || person.first[1] === chapter),
    );
  }
  candidates.sort((a, b) => b.verses.size - a.verses.size);
  return candidates[0]?.id ?? null;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function getJson(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.status === 429 || response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }
  throw new Error(`${url} kept failing`);
}

async function download(url, path) {
  if (await exists(path)) return true;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.status === 429 || response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      continue;
    }
    if (!response.ok) return false;
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
    return true;
  }
  return false;
}

/**
 * Copies a file, waiting out a lock. The project can sit in a synced folder (OneDrive),
 * whose client briefly holds new files open while it uploads them.
 */
async function copyRetry(from, to) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await copyFile(from, to);
      return;
    } catch (error) {
      if (!['EBUSY', 'EPERM', 'EACCES'].includes(error.code) || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
}

/** Runs `work` over every item, a few at a time, so the image servers are not hammered. */
async function inBatches(items, size, work) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(work));
  }
}

const FREE_LICENCE = /public domain|^pd|cc0|cc[ -]by|cc-zero|gfdl|fal|attribution|sentinel|ogl/i;

/** Strips the HTML Commons puts in its artist field, keeping the name. */
function textOf(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/**
 * Builds profiles.json and copies every picture it uses into the app.
 */
export async function buildProfiles({ dbPath, raw, web, data, fetchOnce, say }) {
  say('\nProfiles');

  const db = new DatabaseSync(dbPath, { readOnly: true });
  const subjects = new Map();
  for (const row of db.prepare('SELECT id, name, kind FROM subjects').all()) {
    subjects.set(row.id, { id: row.id, name: row.name, kind: row.kind, verses: new Set(), first: null });
  }
  for (const row of db
    .prepare('SELECT subject_id, book_id, chapter, verse FROM mentions ORDER BY book_id, chapter, verse')
    .all()) {
    const subject = subjects.get(row.subject_id);
    if (!subject) continue;
    subject.verses.add(`${row.book_id}:${row.chapter}:${row.verse}`);
    subject.first ??= [row.book_id, row.chapter, row.verse];
  }
  db.close();

  const people = new Map([...subjects].filter(([, s]) => s.kind === 'person'));
  const places = new Map([...subjects].filter(([, s]) => s.kind === 'place'));

  // Theographic.
  const theoPeople = JSON.parse(
    await readFile(await fetchOnce(`${THEOGRAPHIC}people.json`, join(raw, 'theographic-people.json')), 'utf8'),
  );
  const theoPlaces = JSON.parse(
    await readFile(await fetchOnce(`${THEOGRAPHIC}places.json`, join(raw, 'theographic-places.json')), 'utf8'),
  );
  const theoVerses = JSON.parse(
    await readFile(await fetchOnce(`${THEOGRAPHIC}verses.json`, join(raw, 'theographic-verses.json')), 'utf8'),
  );
  const verseKey = new Map(theoVerses.map((record) => [record.id, osisKey(record.fields?.osisRef)]));
  const versesOf = (ids) => new Set((ids ?? []).map((id) => verseKey.get(id)).filter(Boolean));
  const listOf = (value) =>
    Array.isArray(value)
      ? value
      : String(value ?? '')
          .split(/[,;]/)
          .map((part) => part.trim())
          .filter(Boolean);

  const theoPersonCandidates = theoPeople.map((record) => {
    const fields = record.fields ?? {};
    // The display title carries fuller names the name field lacks: "Mary Magdalene",
    // "Jacob (Israel)". Each part is something a TIPNR name might be.
    const title = String(fields.displayTitle ?? '');
    const bare = title.replace(/\s*\([^)]*\)\s*$/, '');
    const inner = /\(([^)]+)\)\s*$/.exec(title)?.[1] ?? '';
    // Each word too, so "Simon Peter" is found as Peter; the verse overlap still has to
    // agree before anything is matched.
    const names = new Set(
      [
        fold(fields.name),
        fold(title),
        fold(bare),
        fold(inner),
        ...bare.split(/\s+/).filter((word) => /^[A-Z]/.test(word)).map(fold),
        ...listOf(fields.alsoCalled).map(fold),
      ].filter(Boolean),
    );
    return { key: record.id, names, verses: versesOf(fields.verses), fields };
  });
  const personMatch = matchByVerses([...people.values()], theoPersonCandidates);

  const theoPlaceCandidates = theoPlaces.map((record) => {
    const fields = record.fields ?? {};
    const names = new Set([fold(fields.kjvName), fold(fields.esvName), ...listOf(fields.aliases).map(fold)].filter(Boolean));
    return { key: record.id, names, verses: versesOf(fields.verses), fields };
  });
  const placeMatchTheo = matchByVerses([...places.values()], theoPlaceCandidates);

  // OpenBible.
  const linesOf = async (name) =>
    (await readFile(await fetchOnce(`${OPENBIBLE}${name}.jsonl`, join(raw, `openbible-${name}.jsonl`)), 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  const ancient = await linesOf('ancient');
  const modern = new Map((await linesOf('modern')).map((record) => [record.id, record]));
  const images = new Map((await linesOf('image')).map((record) => [record.id, record]));

  const linkedTipnr = new Map();
  const openBibleCandidates = ancient.map((record) => {
    const extra = JSON.parse(record.extra || '{}');
    for (const id of record.linked_data?.s3b25cf?.ids ?? []) linkedTipnr.set(id, record.id);
    const names = new Set(
      [
        fold(String(record.friendly_id ?? '').replace(/\s+\d+$/, '')),
        ...Object.keys(record.translation_name_counts ?? {}).map(fold),
      ].filter(Boolean),
    );
    const verses = new Set((extra.osises ?? record.verses?.map((verse) => verse.osis) ?? []).map(osisKey).filter(Boolean));
    return { key: record.id, names, verses, record, extra };
  });
  const openBibleById = new Map(openBibleCandidates.map((candidate) => [candidate.key, candidate]));
  const placeMatchOpen = matchByVerses([...places.values()], openBibleCandidates, { minShare: 0.1 });
  // TIPNR's own links in OpenBible win over a verse match where they exist.
  for (const place of places.values()) {
    const stem = place.id.replace(/-[A-Za-z0-9]*$/, '');
    const linked = linkedTipnr.get(place.id) ?? linkedTipnr.get(stem);
    if (linked && openBibleById.has(linked)) placeMatchOpen.set(place.id, openBibleById.get(linked));
  }

  const mediaRaw = join(raw, 'media');
  const mediaWeb = join(web, '..', 'media');
  for (const folder of ['people', 'places']) {
    await mkdir(join(mediaRaw, folder), { recursive: true });
    await mkdir(join(mediaWeb, folder), { recursive: true });
  }

  // People.
  const outPeople = {};
  for (const person of people.values()) {
    const match = personMatch.get(person.id);
    if (!match) continue;
    const fields = match.fields;
    const bio = listOf(fields.dictText).map(plain).filter(Boolean);
    // Other names are proper names; the source also holds descriptions like "mother".
    const aka = listOf(fields.alsoCalled).filter(
      (name) => /^[A-Z]/.test(name) && fold(name) !== fold(person.name),
    );
    const entry = {};
    // TIPNR files some people under a later name — Jacob as Israel. Theographic titles
    // them "Jacob (Israel)", so where the bracket holds TIPNR's name, the name before it
    // is the one a reader would look for, and TIPNR's is kept as "also called".
    const titled = /^([^()]+?)\s*\(([^)]+)\)\s*$/.exec(String(fields.displayTitle ?? ''));
    // Only that pattern: the plain name field mostly differs by spelling (Henoch for
    // Enoch), and renaming on it changed eighty people into variant spellings.
    const everyday =
      titled && fold(titled[2]) === fold(person.name) && fold(titled[1]) !== fold(person.name)
        ? titled[1]
        : null;
    if (everyday) {
      entry.name = everyday;
      aka.unshift(person.name);
    } else if (fields.displayTitle && fields.displayTitle !== person.name && fields.displayTitle !== fields.name) {
      entry.title = fields.displayTitle;
    }
    if (bio.length) entry.bio = bio;
    if (aka.length) entry.aka = aka.slice(0, 6);
    const born = Number(fields.birthYear);
    const died = Number(fields.deathYear);
    if (Number.isFinite(born) && fields.birthYear) entry.born = born;
    if (Number.isFinite(died) && fields.deathYear) entry.died = died;
    if (Object.keys(entry).length) outPeople[person.id] = entry;
  }
  say(`  ${personMatch.size.toLocaleString()} of ${people.size.toLocaleString()} people matched to Easton's and Theographic`);

  // Portraits.
  const portraitList = JSON.parse(await readFile(join(data, 'portraits.json'), 'utf8')).people;
  const wikidataCachePath = join(mediaRaw, 'wikidata.json');
  const wikidataCache = (await exists(wikidataCachePath))
    ? JSON.parse(await readFile(wikidataCachePath, 'utf8'))
    : {};
  const unresolved = [];
  const wanted = [];
  for (const [selector, title] of portraitList) {
    const id = resolveSelector(selector, people);
    if (!id) {
      unresolved.push(selector);
      continue;
    }
    wanted.push({ id, title });
  }

  for (const { title } of wanted) {
    if (wikidataCache[title] !== undefined) continue;
    try {
      const response = await getJson(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(title)}&props=claims&format=json`,
      );
      const entity = Object.values(response.entities ?? {})[0];
      const file = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
      wikidataCache[title] = { item: entity?.id ?? null, file };
    } catch {
      wikidataCache[title] = { item: null, file: null };
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  await writeFile(wikidataCachePath, JSON.stringify(wikidataCache, null, 1));

  const commonsCachePath = join(mediaRaw, 'commons.json');
  const commonsCache = (await exists(commonsCachePath))
    ? JSON.parse(await readFile(commonsCachePath, 'utf8'))
    : {};
  const files = [...new Set(wanted.map(({ title }) => wikidataCache[title]?.file).filter(Boolean))];
  const missingFiles = files.filter((file) => commonsCache[file] === undefined);
  for (let index = 0; index < missingFiles.length; index += 40) {
    const batch = missingFiles.slice(index, index + 40);
    try {
      const response = await getJson(
        'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo' +
          '&iiprop=url|extmetadata&iiurlwidth=330&titles=' +
          encodeURIComponent(batch.map((file) => `File:${file}`).join('|')),
      );
      const normalized = new Map((response.query?.normalized ?? []).map((pair) => [pair.to, pair.from]));
      for (const page of response.query?.pages ?? []) {
        const original = (normalized.get(page.title) ?? page.title).replace(/^File:/, '');
        const info = page.imageinfo?.[0];
        const meta = info?.extmetadata ?? {};
        commonsCache[original] = info
          ? {
              thumb: info.thumburl ?? info.url,
              page: info.descriptionurl,
              licence: textOf(meta.LicenseShortName?.value) || 'unknown',
              artist: textOf(meta.Artist?.value),
            }
          : null;
      }
    } catch {
      // Left uncached, so the next build tries again.
    }
  }
  await writeFile(commonsCachePath, JSON.stringify(commonsCache, null, 1));

  let portraits = 0;
  await inBatches(wanted, 4, async ({ id, title }) => {
    const file = wikidataCache[title]?.file;
    const info = file ? commonsCache[file] : null;
    if (!info || !FREE_LICENCE.test(info.licence)) return;
    const name = `${slugOf(id)}.jpg`;
    const rawPath = join(mediaRaw, 'people', name);
    if (!(await download(info.thumb, rawPath))) return;
    await copyRetry(rawPath, join(mediaWeb, 'people', name));
    outPeople[id] = {
      ...(outPeople[id] ?? {}),
      portrait: {
        file: `media/people/${name}`,
        credit: info.artist || 'Wikimedia Commons',
        licence: info.licence,
        source: info.page,
        wiki: title,
      },
    };
    portraits += 1;
  });
  say(`  ${portraits} portraits (${wanted.length} asked for, ${unresolved.length} not found in the text)`);
  if (unresolved.length) say(`    not resolved: ${unresolved.join(', ')}`);

  // Places.
  const outPlaces = {};
  const located = [];
  for (const place of places.values()) {
    const entry = {};
    const theo = placeMatchTheo.get(place.id);
    if (theo) {
      const bio = listOf(theo.fields.dictText).map(plain).filter(Boolean);
      if (bio.length) entry.bio = bio;
      if (theo.fields.displayTitle && theo.fields.displayTitle !== place.name) entry.title = theo.fields.displayTitle;
      if (theo.fields.featureType) entry.kind = String(theo.fields.featureType).toLowerCase();
    }

    const open = placeMatchOpen.get(place.id);
    if (open) {
      const associations = [...(open.extra.associations ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      const best = associations[0];
      const bestModern = best ? modern.get(best.modern_id) : null;
      const point =
        lonlatOf(bestModern?.lonlat) ??
        lonlatOf(open.record.identifications?.[0]?.resolutions?.[0]?.lonlat);
      if (best) {
        entry.modern = {
          name: best.name,
          confidence: confidenceOf(best.score ?? 0),
          score: best.score ?? 0,
          ...(bestModern?.type ? { type: bestModern.type } : {}),
          ...(bestModern?.precision?.description ? { precision: bestModern.precision.description } : {}),
        };
      }
      const others = associations
        .slice(1, 4)
        .filter((association) => (association.score ?? 0) >= 50)
        .map((association) => ({ name: association.name, confidence: confidenceOf(association.score ?? 0) }));
      if (others.length) entry.alternatives = others;
      if (open.record.types?.[0]) entry.kind ??= open.record.types[0];
      if (point) {
        entry.lonlat = point.map((value) => Math.round(value * 10000) / 10000);
        located.push({ id: place.id, name: place.name, point });
      }

      const thumbnail = best?.thumbnail;
      const image = thumbnail ? images.get(thumbnail.image_id) : null;
      if (image && image.license !== 'copyright' && FREE_LICENCE.test(image.license)) {
        entry.photo = {
          imageId: image.id,
          pattern: image.thumbnail_url_pattern,
          credit: image.credit || image.author || 'OpenBible.info',
          licence: image.license === 'sentinel' ? 'Contains modified Copernicus Sentinel data' : image.license,
          source: image.credit_url || image.url,
          description: String(thumbnail.description ?? '').replace(/<[^>]*>/g, ''),
        };
      }
    }
    if (Object.keys(entry).length) outPlaces[place.id] = entry;
  }

  // How each place relates to the others: the nearest few, and its bearing from Jerusalem.
  const jerusalem = located.find((place) => place.name === 'Jerusalem');
  for (const place of located) {
    const nearest = located
      .filter((other) => other.id !== place.id)
      .map((other) => ({ other, km: distanceKm(place.point, other.point) }))
      .filter(({ km }) => km > 0.2)
      .sort((a, b) => a.km - b.km)
      .slice(0, 6)
      .map(({ other, km }) => ({
        id: other.id,
        km: Math.round(km * 10) / 10,
        dir: compass(place.point, other.point),
      }));
    if (nearest.length) outPlaces[place.id].near = nearest;
    if (jerusalem && jerusalem.id !== place.id) {
      outPlaces[place.id].fromJerusalem = {
        km: Math.round(distanceKm(jerusalem.point, place.point)),
        dir: compass(jerusalem.point, place.point),
      };
    }
  }

  // Place photos, downloaded once and kept. Several places can share one photograph —
  // Bethel and Luz are the same ruins — so each image is fetched once and then given to
  // every place that uses it; fetching it twice at once had both writes collide.
  const byImage = new Map();
  for (const entry of Object.values(outPlaces)) {
    if (!entry.photo) continue;
    const list = byImage.get(entry.photo.imageId) ?? [];
    list.push(entry);
    byImage.set(entry.photo.imageId, list);
  }
  let photos = 0;
  await inBatches([...byImage.entries()], 4, async ([imageId, entries]) => {
    const pattern = entries[0].photo.pattern;
    const name = `${imageId}.jpg`;
    const rawPath = join(mediaRaw, 'places', name);
    const ok = pattern ? await download(pattern.replace('####', '330'), rawPath) : false;
    if (ok) await copyRetry(rawPath, join(mediaWeb, 'places', name));
    for (const entry of entries) {
      if (!ok) {
        delete entry.photo;
        continue;
      }
      delete entry.photo.pattern;
      delete entry.photo.imageId;
      entry.photo.file = `media/places/${name}`;
      photos += 1;
    }
  });
  say(
    `  ${Object.keys(outPlaces).length.toLocaleString()} of ${places.size.toLocaleString()} places profiled, ` +
      `${located.length.toLocaleString()} located, ${photos.toLocaleString()} photographs`,
  );

  // Disputed identifications.
  const identities = JSON.parse(await readFile(join(data, 'identities.json'), 'utf8')).disputes;
  const disputes = [];
  const missing = [];
  for (const dispute of identities) {
    const ids = [];
    for (const selector of dispute.people) {
      const id = resolveSelector(selector, people);
      if (id) ids.push(id);
      else missing.push(`${dispute.id}: ${selector}`);
    }
    if (ids.length) disputes.push({ ...dispute, people: ids });
  }
  say(`  ${disputes.length} disputed identifications attached`);
  if (missing.length) say(`    selectors not resolved: ${missing.join('; ')}`);

  await writeFile(join(web, 'profiles.json'), JSON.stringify({ people: outPeople, places: outPlaces, disputes }));
  const size = (await stat(join(web, 'profiles.json'))).size / 1024 / 1024;
  say(`  wrote profiles.json (${size.toFixed(1)} MB)`);
}
