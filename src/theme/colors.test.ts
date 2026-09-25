import { darkColors, lightColors } from './colors';

function getShape(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return typeof value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, getShape(child)]),
  );
}

function getLeafValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.values(value).flatMap(getLeafValues);
}

function getRelativeLuminance(color: string): number {
  const channels = color
    .slice(1, 7)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function getContrastRatio(first: string, second: string): number {
  const firstLuminance = getRelativeLuminance(first);
  const secondLuminance = getRelativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme colors', () => {
  it('keeps light and dark themes structurally identical', () => {
    expect(getShape(darkColors)).toEqual(getShape(lightColors));
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('uses explicit hex values in the %s theme', (_name, colors) => {
    for (const color of getLeafValues(colors)) {
      expect(color).toMatch(/^#[\dA-F]{6}([\dA-F]{2})?$/i);
    }
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('keeps primary actions readable in the %s theme', (_name, colors) => {
    expect(getContrastRatio(colors.brand.primary, colors.brand.onPrimary)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
