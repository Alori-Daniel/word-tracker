import { isReviewReminderTime } from '@/domain/settings';

import { parseReminderTime } from './review-reminders';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
}));

describe('review reminder time', () => {
  it('accepts and parses a valid 24-hour time', () => {
    expect(isReviewReminderTime('08:05')).toBe(true);
    expect(parseReminderTime('08:05')).toEqual({ hour: 8, minute: 5 });
  });

  it.each(['8:05', '24:00', '12:60', 'soon', ''])('rejects %p', (value) => {
    expect(isReviewReminderTime(value)).toBe(false);
    expect(() => parseReminderTime(value)).toThrow('A valid reminder time is required.');
  });
});
