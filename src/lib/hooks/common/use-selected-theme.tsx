import * as React from 'react';
import { useMMKVString } from 'react-native-mmkv';
import { Uniwind } from 'uniwind';

import { storage } from '@/lib/storage';

const SELECTED_THEME = 'SELECTED_THEME';
export type ColorSchemeType = 'light' | 'dark' | 'system';

/** What the app starts in until the user picks something in Settings. */
export const DEFAULT_THEME: ColorSchemeType = 'dark';

function asTheme(value: string | undefined): ColorSchemeType {
  return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_THEME;
}

/**
 * The theme picked in Settings (stored in MMKV), and the setter for it.
 * Only for choosing the theme — to style by the current theme, use `useUniwind`.
 */
export function useSelectedTheme() {
  const [theme, setStoredTheme] = useMMKVString(SELECTED_THEME, storage);

  const setSelectedTheme = React.useCallback(
    (next: ColorSchemeType) => {
      Uniwind.setTheme(next);
      setStoredTheme(next);
    },
    [setStoredTheme],
  );

  return { selectedTheme: asTheme(theme), setSelectedTheme } as const;
}

/** Called once in the root layout: applies the stored theme, or dark when none is stored. */
export function loadSelectedTheme() {
  Uniwind.setTheme(asTheme(storage.getString(SELECTED_THEME)));
}
