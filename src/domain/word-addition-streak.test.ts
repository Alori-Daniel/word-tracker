import { calculateWordAdditionStreak } from './word-addition-streak';

describe('word addition streak', () => {
  it('counts consecutive addition days through today', () => {
    expect(
      calculateWordAdditionStreak(
        ['2026-09-30', '2026-09-29', '2026-09-28', '2026-09-26'],
        '2026-09-30',
      ),
    ).toMatchObject({ addedToday: true, current: 3 });
  });

  it('keeps the streak alive before the user adds a word today', () => {
    expect(
      calculateWordAdditionStreak(['2026-09-29', '2026-09-28'], '2026-09-30'),
    ).toMatchObject({ addedToday: false, current: 2 });
  });

  it('resets after a full missed day and maps the last week', () => {
    expect(calculateWordAdditionStreak(['2026-09-28'], '2026-09-30')).toEqual({
      addedToday: false,
      current: 0,
      lastSevenDays: [false, false, false, false, true, false, false],
    });
  });
});
