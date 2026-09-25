import { Alert } from 'react-native';

export function showGoogleSignInNotice() {
  Alert.alert(
    'Google sign-in is coming',
    'Account connection will be added in an upcoming build. Continue as a guest now—your words will be ready to migrate later.',
    [{ text: 'Got it' }],
  );
}
