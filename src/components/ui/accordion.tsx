import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';

type Props = {
  accessibilityLabel: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  disabled?: boolean;
  header: React.ReactNode;
  testID?: string;
};

export function Accordion({ accessibilityLabel, children, defaultExpanded = false, disabled = false, header, testID }: Props) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const iconColor = useResolveClassNames('text-muted-foreground').color as string;

  return (
    <View testID={testID}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded }}
        className={`flex-row items-center gap-3 py-1.5 active:opacity-70 ${disabled ? 'opacity-50' : ''}`}
        disabled={disabled}
        onPress={() => setExpanded(current => !current)}
        testID={testID ? `${testID}-trigger` : undefined}
      >
        <View className="min-w-0 flex-1">{header}</View>
        <HugeiconsIcon
          color={iconColor}
          icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
          size={16}
          strokeWidth={2.2}
          testID={testID ? `${testID}-chevron` : undefined}
        />
      </Pressable>
      {expanded
        ? <View testID={testID ? `${testID}-content` : undefined}>{children}</View>
        : null}
    </View>
  );
}
