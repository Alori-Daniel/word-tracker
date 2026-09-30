export type WordAdditionStreak = {
  addedToday: boolean;
  current: number;
  lastSevenDays: boolean[];
};

export const EMPTY_WORD_ADDITION_STREAK: WordAdditionStreak = {
  addedToday: false,
  current: 0,
  lastSevenDays: [false, false, false, false, false, false, false],
};

export function calculateWordAdditionStreak(
  additionDates: readonly string[],
  today = localDateKey(new Date()),
): WordAdditionStreak {
  const dates = new Set(additionDates.filter(isDateKey));
  const yesterday = shiftDateKey(today, -1);
  const start = dates.has(today) ? today : dates.has(yesterday) ? yesterday : null;
  let current = 0;

  if (start) {
    let cursor = start;
    while (dates.has(cursor)) {
      current += 1;
      cursor = shiftDateKey(cursor, -1);
    }
  }

  return {
    addedToday: dates.has(today),
    current,
    lastSevenDays: Array.from({ length: 7 }, (_, index) =>
      dates.has(shiftDateKey(today, index - 6)),
    ),
  };
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateKey(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
