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
});
