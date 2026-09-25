import type { TextStyle } from 'react-native';

export type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption';

type TypographyStyle = Pick<
  TextStyle,
  'fontSize' | 'fontWeight' | 'letterSpacing' | 'lineHeight'
>;

export const typography: Record<TextVariant, TypographyStyle> = {
  display: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.1,
    lineHeight: 42,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.15,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.25,
    lineHeight: 16,
  },
};
