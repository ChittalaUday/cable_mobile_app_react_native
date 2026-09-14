import * as React from 'react';
import { CredentialsCard } from '@/components/auth/credentials-card';
import { render, screen } from '@/lib/test-utils';

describe('credentials card', () => {
  it('shows every backend-supported login option initially', () => {
    render(
      <CredentialsCard
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
        otpRequested={false}
        resendIn={0}
        remember={false}
        setRemember={jest.fn()}
        loading={false}
        onSubmit={jest.fn()}
        onResendOtp={jest.fn()}
      />,
    );

    expect(screen.getByTestId('email-input')).toBeOnTheScreen();
    expect(screen.getByTestId('password-input')).toBeOnTheScreen();
    expect(screen.getByTestId('login-button')).toBeOnTheScreen();
    expect(screen.getByTestId('phone-otp-option')).toBeOnTheScreen();
  });
});
