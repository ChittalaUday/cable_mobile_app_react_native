import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { RefreshBoxButton } from './refresh-box-button';

const BOX = '5f1c0d6e-7a4b-4c1e-9d3a-0b5e8f6a1c42';
const RUN = '2f1c0d6e-7a4b-4c1e-9d3a-0b5e8f6a1c42';

const mockNotify = jest.fn();
const mockMutate = jest.fn();
let mockStarting = false;
let mockProgress: { data?: { status: string; message: string | null }; isError?: boolean } = {};

jest.mock('@/components/common/dialogs', () => ({ dialogs: { notify: (...args: unknown[]) => mockNotify(...args) as unknown } }));
jest.mock('@/lib/hooks/api/use-job-runs', () => ({
  useStartInstantRefresh: () => ({ mutate: mockMutate, isPending: mockStarting }),
  useInstantRefreshStatus: () => ({ data: undefined, isError: false, ...mockProgress }),
}));

/** The server accepts the refresh and names its run. */
function accept() {
  mockMutate.mockImplementation((_body: unknown, options: { onSuccess: (response: { run: { id: string } }) => void }) => options.onSuccess({ run: { id: RUN } }));
}

beforeEach(() => {
  mockNotify.mockReset();
  mockMutate.mockReset();
  mockStarting = false;
  mockProgress = {};
});

describe('refreshBoxButton', () => {
  it('starts the refresh for this box and stays disabled until the run is over', () => {
    accept();
    mockProgress = { data: { status: 'running', message: null } };
    render(<RefreshBoxButton customerEquipmentId={BOX} />);

    fireEvent.press(screen.getByTestId('refresh-box'));

    expect(mockMutate).toHaveBeenCalledWith({ customerEquipmentId: BOX }, expect.any(Object));
    expect(screen.getByText('Refreshing…')).toBeTruthy();
    expect(screen.getByTestId('refresh-box').props.accessibilityState).toMatchObject({ disabled: true });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('says the box was refreshed, once, when the run succeeds, and can be pressed again', () => {
    accept();
    const view = render(<RefreshBoxButton customerEquipmentId={BOX} />);
    fireEvent.press(screen.getByTestId('refresh-box'));

    mockProgress = { data: { status: 'succeeded', message: null } };
    view.rerender(<RefreshBoxButton customerEquipmentId={BOX} />);
    view.rerender(<RefreshBoxButton customerEquipmentId={BOX} />);

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith('Box refreshed', 'ACT confirmed it: the set-top box was successfully reactivated.');
    expect(screen.getByText('Refresh box')).toBeTruthy();
    expect(screen.getByTestId('refresh-box').props.accessibilityState).not.toMatchObject({ disabled: true });
  });

  it('shows the server\'s safe message when ACT refuses the box', () => {
    accept();
    const view = render(<RefreshBoxButton customerEquipmentId={BOX} />);
    fireEvent.press(screen.getByTestId('refresh-box'));

    mockProgress = { data: { status: 'failed', message: 'ACT does not know this set-top box at the LCO location' } };
    view.rerender(<RefreshBoxButton customerEquipmentId={BOX} />);

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith('Not refreshed', 'ACT does not know this set-top box at the LCO location');
  });

  it('gives a plain message when the run ended without one', () => {
    accept();
    const view = render(<RefreshBoxButton customerEquipmentId={BOX} />);
    fireEvent.press(screen.getByTestId('refresh-box'));

    mockProgress = { data: { status: 'cancelled', message: null } };
    view.rerender(<RefreshBoxButton customerEquipmentId={BOX} />);

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith('Not refreshed', 'ACT could not refresh this set-top box.');
  });

  it('says why when the server refuses to start it', () => {
    mockMutate.mockImplementation((_body: unknown, options: { onError: (error: Error) => void }) => options.onError(new Error('Automation worker is unavailable')));
    render(<RefreshBoxButton customerEquipmentId={BOX} />);

    fireEvent.press(screen.getByTestId('refresh-box'));

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith('Not refreshed', 'Automation worker is unavailable');
    expect(screen.getByText('Refresh box')).toBeTruthy();
  });

  it('says so, and frees the button, when the progress cannot be read', () => {
    accept();
    const view = render(<RefreshBoxButton customerEquipmentId={BOX} />);
    fireEvent.press(screen.getByTestId('refresh-box'));

    mockProgress = { isError: true };
    view.rerender(<RefreshBoxButton customerEquipmentId={BOX} />);

    expect(mockNotify).toHaveBeenCalledWith('Not refreshed', expect.stringContaining('Could not check'));
    expect(screen.getByText('Refresh box')).toBeTruthy();
  });
});
