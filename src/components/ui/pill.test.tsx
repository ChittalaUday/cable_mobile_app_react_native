import * as React from 'react';

import { Pill } from '@/components/ui';
import { cleanup, screen, setup } from '@/lib/test-utils';

afterEach(cleanup);

describe('pill component', () => {
  it('exposes its selected state and handles presses', async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <Pill label="Tomorrow" selected onPress={onPress} testID="next-visit" />,
    );

    expect(screen.getByTestId('next-visit').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText('Tomorrow')).toBeOnTheScreen();

    await user.press(screen.getByTestId('next-visit'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('maps selection to radio and checkbox accessibility state', () => {
    setup(
      <>
        <Pill label="Done" selected accessibilityRole="radio" testID="radio-pill" />
        <Pill label="Sports" selected accessibilityRole="checkbox" testID="checkbox-pill" />
      </>,
    );

    expect(screen.getByTestId('radio-pill').props.accessibilityRole).toBe('radio');
    expect(screen.getByTestId('radio-pill').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('checkbox-pill').props.accessibilityRole).toBe('checkbox');
    expect(screen.getByTestId('checkbox-pill').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('exposes disabled state and ignores presses', async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <Pill label="Unavailable" disabled onPress={onPress} testID="disabled-pill" />,
    );

    expect(screen.getByTestId('disabled-pill')).toBeDisabled();
    expect(screen.getByTestId('disabled-pill').props.accessibilityState).toMatchObject({
      disabled: true,
      selected: false,
    });
    expect(screen.getByTestId('disabled-pill').props.className).toContain('opacity-50');

    await user.press(screen.getByTestId('disabled-pill'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies compact solid styling and layout overrides', () => {
    setup(
      <Pill
        className="mr-2"
        label="All"
        selected
        size="sm"
        testID="styled-pill"
        textClassName="capitalize"
      />,
    );

    expect(screen.getByTestId('styled-pill').props.className).toEqual(expect.stringContaining('rounded-full'));
    expect(screen.getByTestId('styled-pill').props.className).toEqual(expect.stringContaining('bg-primary-600'));
    expect(screen.getByTestId('styled-pill').props.className).toEqual(expect.stringContaining('px-3'));
    expect(screen.getByTestId('styled-pill').props.className).toEqual(expect.stringContaining('mr-2'));
    expect(screen.getByTestId('styled-pill-label').props.className).toEqual(expect.stringContaining('text-white'));
    expect(screen.getByTestId('styled-pill-label').props.className).toEqual(expect.stringContaining('capitalize'));
  });

  it('uses a tinted selected treatment for the soft variant', () => {
    setup(<Pill label="UPI" selected variant="soft" testID="soft-pill" />);

    expect(screen.getByTestId('soft-pill').props.className).toEqual(expect.stringContaining('bg-primary-50'));
    expect(screen.getByTestId('soft-pill').props.className).toEqual(expect.stringContaining('border-primary-500'));
    expect(screen.getByTestId('soft-pill-label').props.className).toEqual(expect.stringContaining('text-primary-700'));
  });

  it('uses semantic foreground colors for the neutral variant', () => {
    setup(<Pill label="English" selected variant="neutral" testID="neutral-pill" />);

    expect(screen.getByTestId('neutral-pill').props.className).toEqual(expect.stringContaining('bg-foreground'));
    expect(screen.getByTestId('neutral-pill-label').props.className).toEqual(expect.stringContaining('text-background'));
  });
});
