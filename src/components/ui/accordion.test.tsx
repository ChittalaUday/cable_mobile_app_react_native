import * as React from 'react';

import { Accordion, Text } from '@/components/ui';
import { cleanup, screen, setup } from '@/lib/test-utils';

afterEach(cleanup);

describe('accordion component', () => {
  it('reveals its content when the trigger is pressed', async () => {
    const { user } = setup(
      <Accordion
        accessibilityLabel="Area details"
        header={<Text>Mandapeta</Text>}
        testID="area"
      >
        <Text>Mandapeta / Group C</Text>
      </Accordion>,
    );

    expect(screen.queryByTestId('area-content')).not.toBeOnTheScreen();
    expect(screen.getByTestId('area-chevron')).toBeOnTheScreen();
    expect(screen.getByTestId('area-trigger').props.accessibilityState).toMatchObject({ expanded: false });

    await user.press(screen.getByTestId('area-trigger'));

    expect(screen.getByTestId('area-content')).toBeOnTheScreen();
    expect(screen.getByText('Mandapeta / Group C')).toBeOnTheScreen();
    expect(screen.getByTestId('area-trigger').props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('can start expanded', () => {
    setup(
      <Accordion
        accessibilityLabel="Area details"
        defaultExpanded
        header={<Text>Mandapeta</Text>}
        testID="open-area"
      >
        <Text>Area content</Text>
      </Accordion>,
    );

    expect(screen.getByTestId('open-area-content')).toBeOnTheScreen();
    expect(screen.getByTestId('open-area-trigger').props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('does not expand while disabled', async () => {
    const { user } = setup(
      <Accordion
        accessibilityLabel="Unavailable details"
        disabled
        header={<Text>Unavailable</Text>}
        testID="disabled-area"
      >
        <Text>Hidden content</Text>
      </Accordion>,
    );

    expect(screen.getByTestId('disabled-area-trigger')).toBeDisabled();
    await user.press(screen.getByTestId('disabled-area-trigger'));
    expect(screen.queryByText('Hidden content')).not.toBeOnTheScreen();
  });
});
