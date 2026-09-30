import { Platform, type TextStyle } from 'react-native';

export type TextVariant =
  | 'editorial'
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'label'
  | 'caption';

type TypographyStyle = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'fontWeight' | 'letterSpacing' | 'lineHeight'
>;

export const typography: Record<TextVariant, TypographyStyle> = {
  editorial: {
    fontFamily: Platform.select({ android: 'serif', default: 'Georgia', ios: 'Georgia' }),
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 50,
  },
  display: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1.1,
    lineHeight: 42,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 33,
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
