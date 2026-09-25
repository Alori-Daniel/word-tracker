import { calculateReviewSchedule } from './review-scheduler';

const NOW = new Date('2026-09-25T12:00:00.000Z');

describe('calculateReviewSchedule', () => {
  it('returns forgotten words in ten minutes and moves them back to learning', () => {
    expect(
      calculateReviewSchedule({
        currentStatus: 'mastered',
        now: NOW,
        previousEaseFactor: 2.5,
        previousIntervalDays: 30,
        response: 'forgot',
      }),
    ).toEqual({
      easeFactor: 2.3,
      intervalDays: 0,
      nextReviewAt: '2026-09-25T12:10:00.000Z',
      status: 'learning',
    });
  });

  it('halves an uncertain interval and regresses mastered words to familiar', () => {
    expect(
      calculateReviewSchedule({
        currentStatus: 'mastered',
        now: NOW,
        previousEaseFactor: 2.5,
        previousIntervalDays: 8,
        response: 'not_sure',
      }),
    ).toEqual({
      easeFactor: 2.4,
      intervalDays: 4,
      nextReviewAt: '2026-09-29T12:00:00.000Z',
      status: 'familiar',
    });
  });

  it('grows known intervals and advances learning status', () => {
    const first = calculateReviewSchedule({
      currentStatus: 'learning',
      now: NOW,
      response: 'know',
    });
    const second = calculateReviewSchedule({
      currentStatus: first.status,
      now: NOW,
      previousEaseFactor: first.easeFactor,
      previousIntervalDays: first.intervalDays,
      response: 'know',
    });
    const established = calculateReviewSchedule({
      currentStatus: 'familiar',
      now: NOW,
      previousEaseFactor: 2.5,
      previousIntervalDays: 18,
      response: 'know',
    });

    expect(first).toEqual(
      expect.objectContaining({ easeFactor: 2.6, intervalDays: 3, status: 'learning' }),
    );
    expect(second).toEqual(
      expect.objectContaining({ easeFactor: 2.7, intervalDays: 7, status: 'familiar' }),
    );
    expect(established).toEqual(
      expect.objectContaining({ easeFactor: 2.6, intervalDays: 45, status: 'mastered' }),
    );
  });

  it('rejects an invalid review timestamp', () => {
    expect(() =>
      calculateReviewSchedule({
        currentStatus: 'learning',
        now: new Date('invalid'),
        response: 'know',
      }),
    ).toThrow('A valid review date is required.');
  });
});
