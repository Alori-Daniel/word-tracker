import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { isReviewReminderTime } from '@/domain/settings';

const REVIEW_REMINDER_IDENTIFIER = 'wordecho-daily-review-reminder';
const REVIEW_REMINDER_CHANNEL = 'review-reminders';

export class ReviewReminderPermissionError extends Error {
  constructor() {
    super('Notification permission was not granted.');
    this.name = 'ReviewReminderPermissionError';
  }
}

export function configureReviewReminderPresentation() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function parseReminderTime(time: string): { hour: number; minute: number } {
  if (!isReviewReminderTime(time)) {
    throw new Error('A valid reminder time is required.');
  }

  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

export async function scheduleDailyReviewReminder(time: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Daily reminders are available in the iOS and Android apps.');
  }

  const { hour, minute } = parseReminderTime(time);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REVIEW_REMINDER_CHANNEL, {
      importance: Notifications.AndroidImportance.DEFAULT,
      name: 'Daily review reminders',
    });
  }

  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    permissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: false,
      },
    });
  }

  if (!permissions.granted) {
    throw new ReviewReminderPermissionError();
  }

  await cancelDailyReviewReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: REVIEW_REMINDER_IDENTIFIER,
    content: {
      body: 'A few focused minutes will keep your saved words fresh.',
      data: { destination: 'review' },
      title: 'Ready for today’s WordEcho review?',
    },
    trigger: {
      channelId: Platform.OS === 'android' ? REVIEW_REMINDER_CHANNEL : undefined,
      hour,
      minute,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
  });
}

export async function cancelDailyReviewReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(REVIEW_REMINDER_IDENTIFIER);
}

export function isReviewReminderResponse(
  response: Notifications.NotificationResponse | null | undefined,
): boolean {
  return response?.notification.request.content.data?.destination === 'review';
}
