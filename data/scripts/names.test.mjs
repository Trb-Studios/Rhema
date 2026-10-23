import { describe, expect, it } from 'vitest';
import { expandForm, kjvForms, parseRef, parseNames } from './names.mjs';

describe('reading a name as the King James prints it', () => {
  it('takes the King James form when the versions differ', () => {
    expect(kjvForms('Abijah =ESV,NIV; Abiah =KJV')).toEqual(['Abiah']);
    expect(kjvForms('Jeiel =ESV,NIV,LQ; Jehiel =KJV')).toEqual(['Jehiel']);
  });

  it('takes every form when the versions agree', () => {
    expect(kjvForms('Aaron')).toEqual(['Aaron']);
  });

  it('splits several forms held in one field', () => {
    // "Israel,Israelite" is two spellings, not one. The commas after an "=" belong to
    // the list of versions instead.
    expect(kjvForms('Israel,Israelite')).toEqual(['Israel', 'Israelite']);
    expect(kjvForms('Abijah =ESV,NIV,KJV')).toEqual(['Abijah']);
  });

  it('leaves out the marker for someone meant but not named', () => {
    expect(kjvForms('[ ]')).toEqual([]);
    expect(kjvForms('')).toEqual([]);
  });
});

describe('expanding a written form', () => {
  it('reads an optional word both ways', () => {
    expect(expandForm('(Mount )Sinai').sort()).toEqual(['Mount Sinai', 'Sinai']);
    expect(expandForm('Red (Sea)').sort()).toEqual(['Red', 'Red Sea']);
  });

  it('runs a hyphenated name together, as this translation prints it', () => {
    // The King James prints Baal-zephon as Baalzephon.
    expect(expandForm('Baal-zephon')).toContain('Baalzephon');
    expect(expandForm('Pi-hahiroth')).toContain('Pihahiroth');
  });

  it('reads a phrase split across slashes', () => {
    expect(expandForm('desert of/ Sinai/wilderness of/ Sinai')).toContain('desert of Sinai');
    expect(expandForm('desert of/ Sinai/wilderness of/ Sinai')).toContain('wilderness of Sinai');
  });

  it('leaves an ordinary name alone', () => {
    expect(expandForm('Aaron')).toEqual(['Aaron']);
  });
});

describe('reading a reference', () => {
  it('finds the book, chapter and verse', () => {
    expect(parseRef('Exo.4.14')).toEqual({ bookId: 2, chapter: 4, verse: 14 });
    expect(parseRef('Gen.1.1')).toEqual({ bookId: 1, chapter: 1, verse: 1 });
    expect(parseRef('Rev.22.21')).toEqual({ bookId: 66, chapter: 22, verse: 21 });
  });

  it('handles the numbered books', () => {
    expect(parseRef('1Ch.2.47')?.bookId).toBe(13);
    expect(parseRef('3Jn.1.1')?.bookId).toBe(64);
  });

  it('tells Judges from Jude', () => {
    expect(parseRef('Jdg.1.1')?.bookId).toBe(7);
    expect(parseRef('Jud.1.1')?.bookId).toBe(65);
  });

  it('ignores a letter added to tell two uses in one verse apart', () => {
    expect(parseRef('Exo.7.10a')).toEqual({ bookId: 2, chapter: 7, verse: 10 });
    expect(parseRef('Exo.7.10b')).toEqual({ bookId: 2, chapter: 7, verse: 10 });
  });

  it('refuses what is not a reference in this Bible', () => {
    expect(parseRef('LXX Gen.1.1')).toBe(null);
    expect(parseRef('1Cl.5.1')).toBe(null);
    expect(parseRef('')).toBe(null);
    expect(parseRef('nonsense')).toBe(null);
  });
});

describe('reading a record', () => {
  const file = [
    '$========== PERSON(s)',
    [
      'Aaron@Exo.4.14-Heb=H0175',
      'High Priest',
      'Amram@Exo.6.18-1Ch + Jochebed@Exo.6.20-Num',
      'Moses@Exo.2.10-Rev, Miriam@Exo.15.20-Mic',
      'Elisheba@Exo.6.23',
      'Nadab@Exo.6.23-1Ch',
      'Tribe of Levi',
      '#A high priest from the tribe of Levi, first mentioned at <ref="Exo.4.14">Exo.4.14</ref>) <br>referred to as <strong="H0175">Aaron</strong>.',
      'Male',
    ].join('\t'),
    ['– Named', 'Aaron@Exo.4.14-Heb', 'H0175', 'Aaron', 'Exo.4.14; Exo.4.27'].join('\t'),
    ['– Total', 'Aaron', 'Aaron', 'H0175', 'Exo.4.14; '].join('\t'),
    '@Short= Aaron was the first high priest.',
    '$========== PLACE',
    ['Eden@Gen.2.8=H5731', 'near nothing', '', '', '', '', 'Mesopotamia', '#A garden.', 'Place'].join('\t'),
    ['– Named', 'Eden@Gen.2.8', 'H5731', 'Eden', 'Gen.2.8; Gen.4.16'].join('\t'),
  ].join('\n');

  const { subjects, marks } = parseNames(file);

  it('reads the people and the places', () => {
    expect(subjects.size).toBe(2);
    expect(subjects.get('Aaron@Exo.4.14-Heb')?.kind).toBe('person');
    expect(subjects.get('Eden@Gen.2.8')?.kind).toBe('place');
  });

  it('keeps the family', () => {
    const aaron = subjects.get('Aaron@Exo.4.14-Heb');
    const ids = (list) => list.map((entry) => entry.id);
    expect(ids(aaron?.parents ?? [])).toEqual(['Amram@Exo.6.18-1Ch', 'Jochebed@Exo.6.20-Num']);
    expect(ids(aaron?.siblings ?? [])).toEqual(['Moses@Exo.2.10-Rev', 'Miriam@Exo.15.20-Mic']);
    expect(ids(aaron?.partners ?? [])).toEqual(['Elisheba@Exo.6.23']);
    expect(ids(aaron?.children ?? [])).toEqual(['Nadab@Exo.6.23-1Ch']);
    expect(aaron?.tribe).toBe('Tribe of Levi');
  });

  it('takes the marker off a link and keeps what it meant', () => {
    // A link reading "David@Rut.4.17-Rev(?)" points at David; the (?) says the source
    // was not certain. Leaving it on the identifier meant one link in twenty pointed
    // at nobody at all.
    const { subjects: parsed } = parseNames(
      [
        '$========== PERSON(s)',
        [
          'Someone@Gen.1.1',
          '',
          'Jesse@Rut.4.17-Rom(?) + Mahol@1Ki.4.31(a)',
          '',
          '',
          'Canaan@Gen.9.18-1Ch(d)',
          '',
          '#A man.',
          'Male',
        ].join('\t'),
        ['\u2013 Named', 'Someone@Gen.1.1', 'H1', 'Someone', 'Gen.1.1'].join('\t'),
      ].join('\n'),
    );
    const person = parsed.get('Someone@Gen.1.1');
    expect(person?.parents).toEqual([
      { id: 'Jesse@Rut.4.17-Rom', note: 'uncertain' },
      { id: 'Mahol@1Ki.4.31', note: 'ancestor' },
    ]);
    expect(person?.children).toEqual([{ id: 'Canaan@Gen.9.18-1Ch', note: 'descended' }]);
  });

  it('keeps the first sentence of the summary and drops the list of forms', () => {
    const summary = subjects.get('Aaron@Exo.4.14-Heb')?.summary ?? '';
    expect(summary).toBe('A high priest from the tribe of Levi.');
    expect(summary).not.toContain('<');
    expect(summary).not.toContain('referred to as');
  });

  it('leaves out the descriptions an AI wrote', () => {
    const aaron = subjects.get('Aaron@Exo.4.14-Heb');
    expect(JSON.stringify(aaron)).not.toContain('first high priest');
  });

  it('records where each one is named', () => {
    expect(marks.get(2)?.get('4:14')).toEqual([['Aaron', 'Aaron@Exo.4.14-Heb']]);
    expect(marks.get(1)?.get('2:8')).toEqual([['Eden', 'Eden@Gen.2.8']]);
    expect(marks.get(1)?.get('4:16')).toEqual([['Eden', 'Eden@Gen.2.8']]);
  });

  it('does not treat the Total line as a set of spellings', () => {
    // Its third column holds Strong's numbers, which are not names.
    const forms = [...(subjects.get('Aaron@Exo.4.14-Heb')?.forms ?? [])];
    expect(forms).toEqual(['Aaron']);
  });

  it('skips the template rows that describe the columns', () => {
    const { subjects: none } = parseNames(
      '$========== PERSON(s)\nUnifiedName=uStrong\tDescription\tParents Male+Female',
    );
    expect(none.size).toBe(0);
  });
});
