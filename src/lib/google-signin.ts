import { GoogleSignin } from '@react-native-google-signin/google-signin';

import Env from '../../env';

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: Env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}
