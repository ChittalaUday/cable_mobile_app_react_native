import type { ViewStyle } from 'react-native';
import type { RemoteDetail } from '@/lib/api/types';
import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import i18n from '@/lib/i18n';
import { groupFor, isPowerKey } from './keys';
import { MOULDED, RemotePad } from './remote-pad';

function remoteWith(keys: string[]): RemoteDetail {
  return {
    id: 'r1',
    deviceType: 'tv',
    brand: 'Test',
    model: 'Pad',
    source: 'library',
    verified: true,
    notes: null,
    isTenantOwned: false,
    buttons: keys.map(key => ({
      key,
      label: key,
      command: { protocol: 'nec' as const, address: 0, command: 1 },
    })),
  };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

describe('remotePad', () => {
  /**
   * The pad claims a key set and then draws it in hand-written rows, so a key
   * can be listed as moulded and yet have no row that renders it — it would
   * then vanish, because being moulded is exactly what keeps it off the
   * overflow shelves. Nothing else notices; the button is simply gone.
   */
  it('draws every key it claims as moulded', () => {
    const keys = [...MOULDED];
    render(
      <RemotePad remote={remoteWith(keys)} disabled={false} sending={null} onPress={jest.fn()} />,
    );

    const missing = keys.filter(key => screen.queryAllByLabelText(
      i18n.t(`remote.keys.${key}`, { defaultValue: key }),
    ).length === 0);

    expect(missing).toEqual([]);
  });

  /** A key the layout does not name still has to reach the user. */
  it('shelves a key the moulded body does not name', () => {
    render(
      <RemotePad remote={remoteWith(['power', 'netflix', 'reminder'])} disabled={false} sending={null} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText('Netflix')).toBeTruthy();
    expect(screen.getByLabelText('Reminder')).toBeTruthy();
  });

  /**
   * The pad overflowed because the direction cluster was built from fixed
   * pixels: a 176px dial holding a 178px row of keys, inside a body only
   * 288px wide at 360dp. React Native does not clip, so the arrows spilled
   * out of the dial and collided with the rockers. Nothing here can be sized
   * in pixels again without this failing.
   */
  it('sizes the direction pad from its cell, not from pixels', () => {
    render(
      <RemotePad
        remote={remoteWith(['up', 'down', 'left', 'right', 'ok'])}
        disabled={false}
        sending={null}
        onPress={jest.fn()}
      />,
    );

    for (const label of ['Up', 'Down', 'Left', 'Right', 'OK']) {
      const style = screen.getByLabelText(label).props.style as ViewStyle;
      expect(style).toMatchObject({ flex: 1, aspectRatio: 1 });
      expect(style.width).toBeUndefined();
    }
  });

  /** The rows that do fit at 320dp stay fixed, so they keep a key-sized key. */
  it('keeps the fixed rows at a fixed diameter', () => {
    render(
      <RemotePad
        remote={remoteWith(['power', 'digit_1'])}
        disabled={false}
        sending={null}
        onPress={jest.fn()}
      />,
    );

    for (const label of ['Power', '1'])
      expect(screen.getByLabelText(label).props.style).toMatchObject({ width: 58, height: 58 });
  });

  it('treats a branded power key as power', () => {
    expect(isPowerKey('power')).toBe(true);
    expect(isPowerKey('power_lg')).toBe(true);
    // Not a power key: the prefix has to be the whole word.
    expect(isPowerKey('powerful')).toBe(false);
    expect(isPowerKey('play')).toBe(false);
  });

  it('files streaming keys on the apps shelf and the rest on the overflow', () => {
    expect(groupFor('netflix')).toBe('apps');
    expect(groupFor('reminder')).toBe('more');
  });
});
