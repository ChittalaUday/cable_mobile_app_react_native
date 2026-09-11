import * as React from 'react';
import { useMMKVString } from 'react-native-mmkv';
import { Uniwind, useUniwind } from 'uniwind';

import { storage } from '../storage';

const SELECTED_THEME = 'SELECTED_THEME';
export type ColorSchemeType = 'light' | 'dark' | 'system';
/**
 * this hooks should only be used while selecting the theme
 * This hooks will return the selected theme which is stored in MMKV
 * selectedTheme should be one of the following values 'light', 'dark' or 'system'
 * don't use this hooks if you want to use it to style your component based on the theme use useUniwind from uniwind instead
 *
 */
export function useSelectedTheme() {
  const { theme: _theme } = useUniwind();
  const [theme, _setTheme] = useMMKVString(SELECTED_THEME, storage);

  // TODO: dark theme is temporarily disabled app-wide - restore `t` here to re-enable.
  const setSelectedTheme = React.useCallback(
    (_t: ColorSchemeType) => {
      Uniwind.setTheme('light');
      _setTheme('light');
    },
    [_setTheme],
  );

  const selectedTheme = (theme ?? 'light') as ColorSchemeType;
  return { selectedTheme, setSelectedTheme } as const;
}
// to be used in the root file to load the selected theme from MMKV
// TODO: dark theme is temporarily disabled app-wide - read the stored theme here to re-enable.
export function loadSelectedTheme() {
  Uniwind.setTheme('light');
}
