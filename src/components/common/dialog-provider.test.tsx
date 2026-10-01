import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { Pressable, Text } from 'react-native';
import { DialogProvider, useDialogs } from './dialog-provider';

/** Presses one button and keeps whatever the dialog resolved with. */
function Harness({ run }: { run: (dialogs: ReturnType<typeof useDialogs>) => Promise<unknown> }) {
  const dialogs = useDialogs();
  const [answer, setAnswer] = React.useState<string>('pending');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void run(dialogs).then(value => setAnswer(String(value ?? 'null')))}
    >
      <Text>ask</Text>
      <Text testID="answer">{answer}</Text>
    </Pressable>
  );
}

function mount(run: (dialogs: ReturnType<typeof useDialogs>) => Promise<unknown>) {
  render(
    <DialogProvider>
      <Harness run={run} />
    </DialogProvider>,
  );
  fireEvent.press(screen.getByText('ask'));
}

/** Lets the promise chain that settles `answer` run. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('the app dialogs', () => {
  it('shows a notice with one button and nothing to decline', async () => {
    mount(async dialogs => dialogs.notify('Not recorded', 'The payment did not go through.'));

    expect(screen.getByText('Not recorded')).toBeTruthy();
    expect(screen.getByText('The payment did not go through.')).toBeTruthy();
    expect(screen.queryByText('Cancel')).toBeNull();

    fireEvent.press(screen.getByText('OK'));
    await settle();

    expect(screen.getByTestId('answer')).toHaveTextContent('null');
  });

  it('resolves a confirm true only when confirmed', async () => {
    mount(async dialogs => dialogs.confirm({ title: 'Delete this?', confirmLabel: 'Delete' }));

    fireEvent.press(screen.getByText('Delete'));
    await settle();

    expect(screen.getByTestId('answer')).toHaveTextContent('true');
  });

  it('resolves a confirm false when cancelled', async () => {
    mount(async dialogs => dialogs.confirm({ title: 'Delete this?' }));

    fireEvent.press(screen.getByText('Cancel'));
    await settle();

    expect(screen.getByTestId('answer')).toHaveTextContent('false');
  });

  it('hands back the typed text, trimmed', async () => {
    mount(async dialogs => dialogs.prompt({ title: 'Why?', confirmLabel: 'Save' }));

    fireEvent.changeText(screen.getByTestId('dialog-input'), '  nobody home  ');
    fireEvent.press(screen.getByText('Save'));
    await settle();

    expect(screen.getByTestId('answer')).toHaveTextContent('nobody home');
  });

  it('treats an empty prompt as no answer, so a blank reason cannot be saved', async () => {
    mount(async dialogs => dialogs.prompt({ title: 'Why?', confirmLabel: 'Save' }));

    fireEvent.changeText(screen.getByTestId('dialog-input'), '   ');
    fireEvent.press(screen.getByText('Save'));
    await settle();

    expect(screen.getByTestId('answer')).toHaveTextContent('null');
  });

  it('closes after answering, rather than leaving the scrim up', async () => {
    mount(async dialogs => dialogs.notify('Done'));

    fireEvent.press(screen.getByText('OK'));
    await settle();

    expect(screen.queryByText('Done')).toBeNull();
  });
});
