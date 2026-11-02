import { dueCutoff, dueWhereConditions, isDue, startOfToday } from './spaced-repetition.js';

describe('spaced-repetition', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('startOfToday is Paris midnight, including on a DST change day', () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date('2026-10-17T21:59:00Z')); // 23:59 in Paris (UTC+2)
    expect(startOfToday().toISOString()).toBe('2026-10-16T22:00:00.000Z');

    vi.setSystemTime(new Date('2026-10-25T22:30:00Z')); // 23:30 in Paris, after the switch to UTC+1
    expect(startOfToday().toISOString()).toBe('2026-10-24T22:00:00.000Z');
  });

  it('dueCutoff counts calendar days across the spring DST change', () => {
    const today = new Date('2026-03-29T22:00:00Z'); // 2026-03-30 00:00 Paris (UTC+2)

    expect(dueCutoff('x', today).toISOString()).toBe('2026-03-30T22:00:00.000Z');
    // 2026-03-29 00:00 Paris was still UTC+1
    expect(dueCutoff('level_0', today).toISOString()).toBe('2026-03-28T23:00:00.000Z');
  });

  it('isDue: memorized on day D is due from day D + interval', () => {
    const today = new Date('2026-10-16T22:00:00Z'); // 2026-10-17 00:00 Paris

    // level x (0 days): anything memorized up to the end of today
    expect(isDue('x', new Date('2026-10-17T21:59:59Z'), today)).toBe(true);
    expect(isDue('x', new Date('2026-10-17T22:00:00Z'), today)).toBe(false);

    // level_0 (2 days): memorized on 2026-10-15 Paris time, even at 23:59
    expect(isDue('level_0', new Date('2026-10-15T21:59:00Z'), today)).toBe(true);
    expect(isDue('level_0', new Date('2026-10-15T22:00:00Z'), today)).toBe(false);
  });

  it('isDue: a word never memorized is never due', () => {
    expect(isDue('x', null)).toBe(false);
  });

  it('dueWhereConditions has one clause per level with its cutoff', () => {
    const today = new Date('2026-10-16T22:00:00Z');

    expect(dueWhereConditions(today)).toEqual(
      (['x', 'level_0', 'level_1', 'level_2', 'v'] as const).map((level) => ({
        level,
        date_memorized: { lt: dueCutoff(level, today) },
      })),
    );
  });
});
