import * as React from 'react';
import { useWindowDimensions } from 'react-native';
import { LoginHero } from '@/components/auth/login-hero';
import { render, screen } from '@/lib/test-utils';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

type StyleLayer = Record<string, unknown> | null | undefined;

/** The height off a style prop, which RN may hand over flat or in layers. */
function heightOf(style: unknown): unknown {
  const layers: StyleLayer[] = Array.isArray(style) ? (style as StyleLayer[]) : [style as StyleLayer];

  return layers.reduce<unknown>((found, layer) => layer?.height ?? found, undefined);
}

describe('login hero', () => {
  /*
   * The hero used to be `h-[32%]`, which resolves against the scrolling content
   * box rather than the screen — and that box grows by the height of the
   * keyboard. The hero grew with it and pushed the credentials card down behind
   * the keyboard. Its height has to come from the window instead.
   */
  it('sizes itself from the screen, not from whatever is scrolling it', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({ width: 393, height: 852, scale: 3, fontScale: 1 });

    render(<LoginHero />);

    expect(heightOf(screen.getByTestId('login-hero').props.style)).toBe(852 * 0.32);
  });

  it('keeps a floor, so a short screen still has room for the branding', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({ width: 320, height: 480, scale: 2, fontScale: 1 });

    render(<LoginHero />);

    // 32% of 480 is 153, which is not enough for the logo and the tagline.
    expect(heightOf(screen.getByTestId('login-hero').props.style)).toBe(200);
  });
});
