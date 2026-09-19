import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * The project's **web** client id — client_type 3 in `google-services.json`.
 *
 * Not the iOS or Android one: the backend checks a token's audience against
 * `GOOGLE_CLIENT_IDS`, which holds this value, and a token minted for either
 * platform client is refused there. It is the same across all three build
 * environments and is a public identifier, so it lives here rather than in
 * `env.ts` — one less thing that can be left unset in a build.
 */
const WEB_CLIENT_ID = '128237611073-jmftq3qlgfcof12ur2165n1s3hhuq2m1.apps.googleusercontent.com';

let configured = false;

/** Lazily, so importing this module on a screen that never signs in costs nothing. */
function configureOnce(): void {
  if (configured)
    return;

  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

/**
 * Run native Google Sign-In and hand back the ID token for our API.
 *
 * `null` means the person backed out of the Google sheet, which is not an
 * error and must not be announced as one.
 *
 * Google's own session is dropped once the token is in hand: ours is the
 * session that lasts, and leaving theirs signed in means an operator handing
 * the phone over cannot pick a different account.
 */
export async function googleIdToken(): Promise<string | null> {
  configureOnce();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (response.type !== 'success')
    return null;

  await GoogleSignin.signOut().catch(() => {});

  return response.data.idToken;
}
