import type { RemoteDetail, RemoteSummary } from '@/lib/api/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import i18n from '@/lib/i18n';

import { RemoteControl } from './remote-control';

const mockGetCapabilities = jest.fn();
const mockTransmit = jest.fn();
const mockUseRemotes = jest.fn();
const mockUseRemote = jest.fn();

jest.mock('@/lib/ir-blaster', () => ({
  getCapabilities: (): unknown => mockGetCapabilities(),
  transmit: (command: unknown): unknown => mockTransmit(command),
}));

jest.mock('@/lib/hooks/api/use-remotes', () => ({

  useRemotes: (options: unknown): unknown => mockUseRemotes(options),

  useRemote: (options: unknown): unknown => mockUseRemote(options),
}));

const SAMSUNG: RemoteSummary = {
  id: 'remote-samsung',
  deviceType: 'tv',
  brand: 'Samsung',
  model: 'Standard TV (BN59 series)',
  source: 'library',
  verified: true,
  notes: null,
  isTenantOwned: false,
  buttonCount: 3,
};

const GENERIC_STB: RemoteSummary = {
  ...SAMSUNG,
  id: 'remote-stb',
  deviceType: 'stb',
  brand: 'Generic',
  model: 'NEC set-top box (reference layout)',
  verified: false,
};

const SAMSUNG_DETAIL: RemoteDetail = {
  ...SAMSUNG,
  buttons: [
    { key: 'power', label: 'Power', command: { protocol: 'samsung', address: 0x0707, command: 0x02 } },
    { key: 'digit_1', label: '1', command: { protocol: 'samsung', address: 0x0707, command: 0x04 } },
    // A key the moulded layout does not name: it must still be reachable.
    { key: 'netflix', label: 'Netflix', command: { protocol: 'samsung', address: 0x0707, command: 0xF3 } },
  ],
};

function setRemotes(remotes: RemoteSummary[]) {
  mockUseRemotes.mockImplementation(({ variables }: { variables: { deviceType: string } }) => ({
    data: remotes.filter(remote => remote.deviceType === variables.deviceType),
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }));
}

async function openSamsung() {
  render(<RemoteControl />);
  expect(await screen.findByText('IR ready')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Samsung Standard TV (BN59 series)' }));
  await screen.findByRole('button', { name: 'Power' });
}

describe('remoteControl', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
    mockGetCapabilities.mockResolvedValue({
      available: true,
      status: 'available',
      carrierFrequencyRanges: [{ minHz: 30_000, maxHz: 60_000 }],
    });
    mockTransmit.mockResolvedValue(undefined);
    setRemotes([SAMSUNG, GENERIC_STB]);
    mockUseRemote.mockReturnValue({ data: SAMSUNG_DETAIL, isPending: false, refetch: jest.fn() });
  });

  it('organises the library by device type and opens a remote on selecting one', async () => {
    render(<RemoteControl />);
    await screen.findByText('IR ready');

    // The TV tab is the default, so the set-top box is not offered yet.
    expect(screen.getByRole('button', { name: 'Samsung Standard TV (BN59 series)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Generic NEC set-top box (reference layout)' })).toBeNull();

    fireEvent.press(screen.getByRole('tab', { name: /Set-Top Box/ }));
    expect(screen.getByRole('button', { name: 'Generic NEC set-top box (reference layout)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Samsung Standard TV (BN59 series)' })).toBeNull();
  });

  it('flags a code set nobody has tested against real hardware', async () => {
    render(<RemoteControl />);
    await screen.findByText('IR ready');
    fireEvent.press(screen.getByRole('tab', { name: /Set-Top Box/ }));

    expect(screen.getByText('Unverified')).toBeTruthy();
  });

  it('transmits the stored command exactly as the library holds it', async () => {
    await openSamsung();

    fireEvent.press(screen.getByRole('button', { name: 'Power' }));

    await waitFor(() => {
      // Straight through: no re-encoding between the database and the emitter.
      expect(mockTransmit).toHaveBeenCalledWith({ protocol: 'samsung', address: 0x0707, command: 0x02 });
    });
    expect(await screen.findByText('Power sent')).toBeTruthy();
  });

  it('reaches a learned key the moulded layout does not name', async () => {
    await openSamsung();

    fireEvent.press(screen.getByRole('button', { name: 'Netflix' }));

    await waitFor(() => {
      expect(mockTransmit).toHaveBeenCalledWith({ protocol: 'samsung', address: 0x0707, command: 0xF3 });
    });
  });

  it('disables commands when the device has no IR emitter', async () => {
    mockGetCapabilities.mockResolvedValue({
      available: false,
      status: 'no-emitter',
      carrierFrequencyRanges: [],
    });

    render(<RemoteControl />);
    expect(await screen.findByText('This device does not have an IR blaster.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Samsung Standard TV (BN59 series)' }));

    const power = await screen.findByRole('button', { name: 'Power' });
    expect(power.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(power);
    expect(mockTransmit).not.toHaveBeenCalled();
  });

  it('keeps controls retryable after a transmission failure', async () => {
    mockTransmit.mockRejectedValueOnce(new Error('native details'));
    await openSamsung();

    fireEvent.press(screen.getByRole('button', { name: 'Power' }));
    expect(await screen.findByText('Could not send the command. Point at the box and try again.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Power' }));
    expect(await screen.findByText('Power sent')).toBeTruthy();
    expect(mockTransmit).toHaveBeenCalledTimes(2);
  });

  it('renders Telugu remote controls after a language switch', async () => {
    await i18n.changeLanguage('te');
    render(<RemoteControl />);

    expect(await screen.findByText('IR సిద్ధంగా ఉంది')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Samsung Standard TV (BN59 series)' }));
    expect(await screen.findByRole('button', { name: 'పవర్' })).toBeTruthy();
  });
});
