import { Platform, type ViewStyle } from 'react-native';

const cardShadow = Platform.select<ViewStyle>({
  android: {
    elevation: 1,
  },
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
});

export const shadows = {
  card: cardShadow ?? {},
} as const;
