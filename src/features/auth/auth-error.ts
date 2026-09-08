export function authErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Create an account first if you are new.';
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Sign in instead.';
    case 'auth/weak-password':
      return 'Use a password with at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase.';
    default:
      return error instanceof Error ? error.message : 'Please try again.';
  }
}
