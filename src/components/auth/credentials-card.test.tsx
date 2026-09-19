import type { LoginConfig } from '@/lib/api/types';
import * as React from 'react';
import { CredentialsCard } from '@/components/auth/credentials-card';
import { OFFLINE_LOGIN_CONFIG } from '@/lib/hooks/api/use-login-config';
import { render, screen } from '@/lib/test-utils';

function renderCard(overrides: Partial<React.ComponentProps<typeof CredentialsCard>> = {}, config: Partial<LoginConfig> = {}) {
  return render(
    <CredentialsCard
      config={{ ...OFFLINE_LOGIN_CONFIG, ...config }}
      email=""
      setEmail={jest.fn()}
      password=""
      setPassword={jest.fn()}
      phone=""
      setPhone={jest.fn()}
      code=""
      setCode={jest.fn()}
      mode="password"
      setMode={jest.fn()}
      channel="whatsapp"
      setChannel={jest.fn()}
      awaitingCode={false}
      emailedTo={null}
      resendIn={0}
      remember={false}
      setRemember={jest.fn()}
      loading={false}
      onSubmit={jest.fn()}
      onResendOtp={jest.fn()}
      onStartOver={jest.fn()}
      onContinueWithGoogle={jest.fn()}
      {...overrides}
    />,
  );
}

describe('credentials card', () => {
  it('shows every backend-supported login option initially', () => {
    renderCard();

    expect(screen.getByTestId('email-input')).toBeOnTheScreen();
    expect(screen.getByTestId('password-input')).toBeOnTheScreen();
    expect(screen.getByTestId('login-button')).toBeOnTheScreen();
    expect(screen.getByTestId('phone-otp-option')).toBeOnTheScreen();
  });

  it('hides the phone option when the server says no channel is answering', () => {
    // Offering a method that cannot work is worse than not offering it.
    renderCard({}, { phoneOtp: false, phoneOtpChannels: [], defaultPhoneOtpChannel: null });

    expect(screen.queryByTestId('phone-otp-option')).toBeNull();
    expect(screen.getByTestId('email-input')).toBeOnTheScreen();
  });

  it('offers a channel choice only when there is more than one', () => {
    renderCard({ mode: 'otp' }, { phoneOtpChannels: ['whatsapp'] });
    expect(screen.queryByTestId('channel-whatsapp')).toBeNull();

    screen.unmount();

    renderCard({ mode: 'otp' }, { phoneOtpChannels: ['whatsapp', 'sms'] });
    expect(screen.getByTestId('channel-whatsapp')).toBeOnTheScreen();
    expect(screen.getByTestId('channel-sms')).toBeOnTheScreen();
  });

  it('takes the channel away once the code is already out', () => {
    // Changing it then would not move a code that has already been sent.
    renderCard({ mode: 'otp', awaitingCode: true }, { phoneOtpChannels: ['whatsapp', 'sms'] });

    expect(screen.queryByTestId('channel-sms')).toBeNull();
    expect(screen.getByTestId('otp-input')).toBeOnTheScreen();
  });

  it('asks for the emailed code, and drops the password fields while it does', () => {
    renderCard({ emailedTo: 'operator@satya.test' }, { passwordNeedsEmailOtp: true });

    expect(screen.getByTestId('otp-input')).toBeOnTheScreen();
    expect(screen.queryByTestId('password-input')).toBeNull();
    expect(screen.queryByTestId('email-input')).toBeNull();

    // The address is shown, because a code is useless if you cannot find it.
    expect(screen.getByText(/operator@satya\.test/)).toBeOnTheScreen();

    // Half-way through, switching method is not the move — backing out is.
    expect(screen.queryByTestId('phone-otp-option')).toBeNull();
    expect(screen.getByTestId('start-over')).toBeOnTheScreen();
  });
});

describe('only what the server offers is on screen', () => {
  it('never draws a password form a deployment has switched off', () => {
    // The dead form was the real bug: it invites a sign-in nothing can answer,
    // and the failure reads as the person's own credentials being wrong.
    renderCard({ mode: 'otp' }, { password: false });

    expect(screen.queryByTestId('password-option')).toBeNull();
    expect(screen.getByTestId('phone-input')).toBeOnTheScreen();
  });

  it('offers Google only when the server says it is configured', () => {
    renderCard();
    expect(screen.queryByTestId('google-option')).toBeNull();

    screen.unmount();
    renderCard({}, { google: true });
    expect(screen.getByTestId('google-option')).toBeOnTheScreen();
  });

  it('says so, rather than showing a form, when every method is off', () => {
    renderCard({}, { password: false, phoneOtp: false, google: false });

    expect(screen.getByTestId('no-methods')).toBeOnTheScreen();
    expect(screen.queryByTestId('login-button')).toBeNull();
  });
});
