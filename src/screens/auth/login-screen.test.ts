import i18n from '@/lib/i18n';

describe('login translations', () => {
  afterAll(() => i18n.changeLanguage('en'));

  it.each([
    { language: 'en', otpOption: 'Continue with Phone OTP', send: 'Send OTP', resend: 'Resend OTP', signOutAll: 'Sign out all devices' },
    { language: 'te', otpOption: 'ఫోన్ OTPతో కొనసాగండి', send: 'OTP పంపండి', resend: 'OTPని మళ్లీ పంపండి', signOutAll: 'అన్ని పరికరాల నుంచి సైన్ అవుట్' },
  ])('localizes the hardened auth flow in $language', async ({ language, otpOption, send, resend, signOutAll }) => {
    await i18n.changeLanguage(language);

    expect(i18n.t('login.send_otp')).toBe(send);
    expect(i18n.t('login.resend_otp')).toBe(resend);
    expect(i18n.t('login.use_otp')).toBe(otpOption);
    expect(i18n.t('profile.sign_out_all')).toBe(signOutAll);
  });
});
