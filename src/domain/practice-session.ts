export function shuffleItems<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

export function appendUniqueById<T extends { id: string }>(
  items: readonly T[],
  item: T,
): T[] {
  return items.some((existing) => existing.id === item.id)
    ? [...items]
    : [...items, item];
}
