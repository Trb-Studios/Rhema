/**
 * Profiles: the longer story of a person or place, a picture, and where a place is now.
 *
 * Built by `npm run data:build` from Easton's Bible Dictionary (by way of Theographic),
 * OpenBible.info's geocoding and Wikimedia Commons; see data/scripts/profiles.mjs. One
 * file for the whole Bible, fetched the first time anyone opens a profile.
 */

export type Portrait = {
  file: string;
  credit: string;
  licence: string;
  source?: string;
  wiki?: string;
};

export type PersonProfile = {
  /** The name a reader would look for, where TIPNR files someone under another (Jacob as Israel). */
  name?: string;
  /** A disambiguated title, such as "James (Son of Zebedee)". */
  title?: string;
  /** Easton's Bible Dictionary on this individual, paragraph by paragraph. */
  bio?: string[];
  aka?: string[];
  /** Estimated years, negative for BC, from the Jones chronology. */
  born?: number;
  died?: number;
  portrait?: Portrait;
};

export type PlaceProfile = {
  title?: string;
  bio?: string[];
  kind?: string;
  modern?: {
    name: string;
    confidence: 'very likely' | 'likely' | 'possible' | 'uncertain';
    score: number;
    type?: string;
    precision?: string;
  };
  alternatives?: Array<{ name: string; confidence: string }>;
  lonlat?: [number, number];
  near?: Array<{ id: string; km: number; dir: string }>;
  fromJerusalem?: { km: number; dir: string };
  photo?: Portrait & { description?: string };
};

export type Dispute = {
  id: string;
  title: string;
  people: string[];
  note: string;
  refs: string[];
};

export type Profiles = {
  people: Record<string, PersonProfile>;
  places: Record<string, PlaceProfile>;
  disputes: Dispute[];
};

let loading: Promise<Profiles> | null = null;

export function loadProfiles(): Promise<Profiles> {
  loading ??= (async () => {
    try {
      const response = await fetch(new URL('./bible/profiles.json', document.baseURI));
      if (!response.ok) throw new Error('missing');
      return (await response.json()) as Profiles;
    } catch {
      // Without profiles the screens still show everything TIPNR knows.
      return { people: {}, places: {}, disputes: [] };
    }
  })();
  return loading;
}

/** A picture's address, beside the page as the data files are. */
export function mediaUrl(file: string): string {
  return new URL(`./${file}`, document.baseURI).toString();
}

/**
 * The part of a title that tells namesakes apart: "James (Son of Zebedee)" gives "Son of
 * Zebedee". A title without brackets, such as "John the Baptist", is itself the
 * distinction, as long as it says more than the bare name.
 */
export function titleHint(title: string | undefined, name?: string): string {
  if (!title) return '';
  const match = /\(([^)]+)\)\s*$/.exec(title);
  if (match) return match[1];
  return name && title.trim().toLowerCase() !== name.trim().toLowerCase() ? title : '';
}

/** A year as a reader says it: 1446 BC, AD 30. */
export function yearLabel(year: number | undefined): string {
  if (year === undefined) return '';
  return year <= 0 ? `${Math.abs(year) + 1} BC` : `AD ${year}`;
}

/**
 * A verse reference as TIPNR and the data files write it ("Mat.10.3") turned into
 * the book, chapter and verse the reader opens.
 */
const TIPNR_BOOKS = [
  'Gen',
  'Exo',
  'Lev',
  'Num',
  'Deu',
  'Jos',
  'Jdg',
  'Rut',
  '1Sa',
  '2Sa',
  '1Ki',
  '2Ki',
  '1Ch',
  '2Ch',
  'Ezr',
  'Neh',
  'Est',
  'Job',
  'Psa',
  'Pro',
  'Ecc',
  'Sng',
  'Isa',
  'Jer',
  'Lam',
  'Ezk',
  'Dan',
  'Hos',
  'Jol',
  'Amo',
  'Oba',
  'Jon',
  'Mic',
  'Nam',
  'Hab',
  'Zep',
  'Hag',
  'Zec',
  'Mal',
  'Mat',
  'Mrk',
  'Luk',
  'Jhn',
  'Act',
  'Rom',
  '1Co',
  '2Co',
  'Gal',
  'Eph',
  'Php',
  'Col',
  '1Th',
  '2Th',
  '1Ti',
  '2Ti',
  'Tit',
  'Phm',
  'Heb',
  'Jas',
  '1Pe',
  '2Pe',
  '1Jn',
  '2Jn',
  '3Jn',
  'Jud',
  'Rev',
];

export function parseRef(ref: string): { bookId: number; chapter: number; verse: number } | null {
  // A range, "Gen.1.1-3", opens at its first verse.
  const match = /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)(?:-\d+)?$/.exec(ref);
  if (!match) return null;
  const index = TIPNR_BOOKS.indexOf(match[1]);
  return index === -1
    ? null
    : { bookId: index + 1, chapter: Number(match[2]), verse: Number(match[3]) };
}
