import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { Text } from '@/components/ui';
import { ScreenHeader } from './screen-header';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
  }),
}));

describe('screenHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and optional subtitle', () => {
    render(<ScreenHeader title="Test Title" subtitle="Test Subtitle" />);

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test Subtitle')).toBeTruthy();
  });

  it('does not render back button when showBack is false', () => {
    render(<ScreenHeader title="Dashboard" />);

    expect(screen.queryByLabelText('Back')).toBeNull();
  });

  it('renders back button and triggers router.back when tapped', () => {
    render(<ScreenHeader title="Details" showBack />);

    const backButton = screen.getByLabelText('Back');
    expect(backButton).toBeTruthy();

    fireEvent.press(backButton);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('calls custom onBack when provided', () => {
    const customBack = jest.fn();
    render(<ScreenHeader title="Details" showBack onBack={customBack} />);

    const backButton = screen.getByLabelText('Back');
    fireEvent.press(backButton);

    expect(customBack).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('renders rightAction and children slots', () => {
    render(
      <ScreenHeader
        title="With Slots"
        rightAction={<Text>Action</Text>}
      >
        <Text>Child Search Bar</Text>
      </ScreenHeader>,
    );

    expect(screen.getByText('Action')).toBeTruthy();
    expect(screen.getByText('Child Search Bar')).toBeTruthy();
  });
});
