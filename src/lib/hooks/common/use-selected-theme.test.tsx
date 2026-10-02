import type * as React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Uniwind } from 'uniwind';
import { storage } from '@/lib/storage';
import { DEFAULT_THEME, loadSelectedTheme, useSelectedTheme } from './use-selected-theme';

jest.mock('uniwind', () => ({ Uniwind: { setTheme: jest.fn() } }));

// A working store for this file: the global MMKV mock keeps nothing.
jest.mock('react-native-mmkv', () => {
  const { useState } = jest.requireActual<typeof React>('react');
  const values = new Map<string, string>();
  const store = {
    getString: (key: string) => values.get(key),
    set: (key: string, value: string) => void values.set(key, value),
    remove: (key: string) => values.delete(key),
  };
  return {
    createMMKV: () => store,
    useMMKVString: (key: string) => {
      const [value, setValue] = useState(values.get(key));
      return [value, (next: string) => {
        values.set(key, next);
        setValue(next);
      }];
    },
  };
});

const setTheme = Uniwind.setTheme as jest.Mock;

beforeEach(() => {
  setTheme.mockClear();
  storage.remove('SELECTED_THEME');
});

describe('selected theme', () => {
  it('starts in dark when nothing has been picked', () => {
    expect(DEFAULT_THEME).toBe('dark');

    loadSelectedTheme();
    expect(setTheme).toHaveBeenCalledWith('dark');

    const { result } = renderHook(() => useSelectedTheme());
    expect(result.current.selectedTheme).toBe('dark');
  });

  it('keeps and reapplies what the user picks, including system', () => {
    const { result } = renderHook(() => useSelectedTheme());

    act(() => result.current.setSelectedTheme('system'));
    expect(setTheme).toHaveBeenLastCalledWith('system');
    expect(result.current.selectedTheme).toBe('system');

    setTheme.mockClear();
    loadSelectedTheme();
    expect(setTheme).toHaveBeenCalledWith('system');
  });

  it('falls back to dark for a stored value it does not know', () => {
    storage.set('SELECTED_THEME', 'sepia');
    loadSelectedTheme();
    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
