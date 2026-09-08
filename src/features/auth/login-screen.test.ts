import { authErrorMessage } from './auth-error';

it('explains invalid Firebase credentials', () => {
  expect(authErrorMessage({ code: 'auth/invalid-credential' }))
    .toBe('Incorrect email or password. Create an account first if you are new.');
});
