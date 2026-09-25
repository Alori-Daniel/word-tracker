import type { LearningStatus, ReviewResponse } from './vocabulary';

const MINIMUM_EASE_FACTOR = 1.3;
const MAXIMUM_EASE_FACTOR = 3;
const MINUTE_IN_MILLISECONDS = 60 * 1000;
const DAY_IN_MILLISECONDS = 24 * 60 * MINUTE_IN_MILLISECONDS;

export type ReviewScheduleInput = {
  currentStatus: LearningStatus;
  now: Date;
  previousEaseFactor?: number;
  previousIntervalDays?: number;
  response: ReviewResponse;
};

export type ReviewSchedule = {
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string;
  status: LearningStatus;
};

export function calculateReviewSchedule({
  currentStatus,
  now,
  previousEaseFactor = 2.5,
  previousIntervalDays = 0,
  response,
}: ReviewScheduleInput): ReviewSchedule {
  if (Number.isNaN(now.valueOf())) {
    throw new Error('A valid review date is required.');
  }

  const previousInterval = Math.max(0, Math.floor(previousIntervalDays));
  const previousEase = clamp(previousEaseFactor, MINIMUM_EASE_FACTOR, MAXIMUM_EASE_FACTOR);

  if (response === 'forgot') {
    return {
      easeFactor: roundEase(previousEase - 0.2),
      intervalDays: 0,
      nextReviewAt: new Date(now.valueOf() + 10 * MINUTE_IN_MILLISECONDS).toISOString(),
      status: 'learning',
    };
  }

  if (response === 'not_sure') {
    const intervalDays = previousInterval <= 1 ? 1 : Math.max(1, Math.ceil(previousInterval / 2));

    return {
      easeFactor: roundEase(previousEase - 0.1),
      intervalDays,
      nextReviewAt: new Date(now.valueOf() + intervalDays * DAY_IN_MILLISECONDS).toISOString(),
      status: currentStatus === 'mastered' ? 'familiar' : currentStatus,
    };
  }

  const intervalDays =
    previousInterval === 0
      ? 3
      : previousInterval < 7
        ? 7
        : Math.min(3650, Math.max(8, Math.round(previousInterval * previousEase)));

  return {
    easeFactor: roundEase(previousEase + 0.1),
    intervalDays,
    nextReviewAt: new Date(now.valueOf() + intervalDays * DAY_IN_MILLISECONDS).toISOString(),
    status:
      currentStatus === 'mastered'
        ? 'mastered'
        : intervalDays >= 21
          ? 'mastered'
          : intervalDays >= 7
            ? 'familiar'
            : currentStatus,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

function roundEase(value: number): number {
  return Math.round(clamp(value, MINIMUM_EASE_FACTOR, MAXIMUM_EASE_FACTOR) * 100) / 100;
}
