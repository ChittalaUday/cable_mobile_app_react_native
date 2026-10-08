import { Linking } from 'react-native';

import { indianDialNumber, openCallIntent } from '@/lib/call-intent';

describe('indian call intent', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['+91 98765-43210', '+919876543210'],
  ])('normalizes %s for the dialer', (phone, expected) => {
    expect(indianDialNumber(phone)).toBe(expected);
  });

  it('opens the dialer with the normalized Indian number', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    await openCallIntent('98765 43210');

    expect(openURL).toHaveBeenCalledWith('tel:+919876543210');
  });
});
