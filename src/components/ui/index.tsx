/* eslint-disable react-refresh/only-export-components */
import { HugeiconsIcon } from '@hugeicons/react-native';
import Svg from 'react-native-svg';
import { withUniwind } from 'uniwind';

export * from './button';
export * from './checkbox';
export { default as colors } from './colors';
export * from './focus-aware-status-bar';
export * from './image';
export * from './input';
export * from './list';
export * from './modal';
export * from './progress-bar';
export * from './select';
export * from './text';
export * from './utils';

// export base components from react-native
export {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
export { SafeAreaView } from 'react-native-safe-area-context';

// Apply withUniwind to Svg to add className support
export const StyledSvg = withUniwind(Svg);

/**
 * A Hugeicons icon coloured by a theme class, so it follows light and dark:
 * `<ThemedIcon icon={X} colorClassName="text-muted-foreground" />`. Use it
 * instead of a fixed grey from `colors`, which only reads on one background.
 */
export const ThemedIcon = withUniwind(HugeiconsIcon);
