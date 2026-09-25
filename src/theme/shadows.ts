import { Platform, type ViewStyle } from 'react-native';

const cardShadow = Platform.select<ViewStyle>({
  android: {
    elevation: 2,
  },
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
});

export const shadows = {
  card: cardShadow ?? {},
} as const;
