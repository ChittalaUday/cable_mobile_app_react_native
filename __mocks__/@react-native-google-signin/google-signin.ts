export const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn(async () => true),
  signIn: jest.fn(async () => ({ type: 'success', data: { idToken: 'google-id-token' } })),
  signOut: jest.fn(async () => {}),
};
