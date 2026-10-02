import type * as ReactModule from 'react';
import type * as ReactNativeModule from 'react-native';
import type { FlatList, FlatListProps, ViewProps } from 'react-native';

/* eslint-disable ts/ban-ts-comment */
/* eslint-disable no-restricted-globals */

// Mock react-native-worklets first
jest.mock('react-native-worklets', () => ({
  __esModule: true,
  default: {},
}));

// Mock @hugeicons/react-native
jest.mock('@hugeicons/react-native', () => {
  const React = require('react') as typeof ReactModule;
  const { View } = require('react-native') as typeof ReactNativeModule;
  return {
    __esModule: true,
    HugeiconsIcon: (props: ViewProps) => React.createElement(View, props),
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native') as typeof ReactNativeModule;

  return {
    __esModule: true,
    default: {
      View,
      ScrollView: View,
      createAnimatedComponent: <T>(component: T) => component,
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn((fn: () => unknown) => fn()),
    withTiming: jest.fn((value: unknown) => value),
    withSpring: jest.fn((value: unknown) => value),
    withDecay: jest.fn((value: unknown) => value),
    withDelay: jest.fn((_: unknown, value: unknown) => value),
    withRepeat: jest.fn((value: unknown) => value),
    withSequence: jest.fn((...values: unknown[]) => values[0]),
    cancelAnimation: jest.fn(),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
      bezier: jest.fn(),
      in: jest.fn((fn: unknown) => fn),
      out: jest.fn((fn: unknown) => fn),
      inOut: jest.fn((fn: unknown) => fn),
    },
    FadeIn: { duration: jest.fn(() => ({})) },
    FadeOut: { duration: jest.fn(() => ({})) },
    FadeInDown: { duration: jest.fn(() => ({})) },
    FadeInUp: { duration: jest.fn(() => ({})) },
    FadeInLeft: { duration: jest.fn(() => ({})) },
    FadeInRight: { duration: jest.fn(() => ({})) },
    SlideInDown: { duration: jest.fn(() => ({})) },
    SlideInUp: { duration: jest.fn(() => ({})) },
    SlideInLeft: { duration: jest.fn(() => ({})) },
    SlideInRight: { duration: jest.fn(() => ({})) },
    Layout: {},
    Keyframe: jest.fn(),
  };
});

// Mock expo-localization
// FlashList measures real layout and sets state from a layout effect, which
// under the test renderer is just an unavoidable act() warning. Rows render the
// same either way, so tests exercise a FlatList.
jest.mock('@shopify/flash-list', () => {
  const React = require('react') as typeof ReactModule;
  const { FlatList } = require('react-native') as typeof ReactNativeModule;

  return {
    __esModule: true,
    FlashList: ({ ref, ...props }: FlatListProps<unknown> & { ref?: React.Ref<FlatList> }) =>
      React.createElement(FlatList, { ...props, ref }),
  };
});

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [
    {
      languageTag: 'en-US',
      languageCode: 'en',
      textDirection: 'ltr',
      digitGroupingSeparator: ',',
      decimalSeparator: '.',
      measurementSystem: 'metric',
      currencyCode: 'USD',
      currencySymbol: '$',
      regionCode: 'US',
    },
  ]),
}));

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
  useMMKVString: jest.fn((_key: string) => [undefined, jest.fn()]),
  useMMKVNumber: jest.fn((_key: string) => [undefined, jest.fn()]),
  useMMKVBoolean: jest.fn((_key: string) => [undefined, jest.fn()]),
  useMMKVObject: jest.fn((_key: string) => [undefined, jest.fn()]),
  createMMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
}));

// Global window object setup for React Native testing
// @ts-expect-error
global.window = {};

// @ts-expect-error
global.window = global;
