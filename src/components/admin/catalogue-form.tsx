import type { ServiceProvider } from '@/lib/api/types';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Card } from '@/components/common/shell';
import { colors, Pressable, Text, View } from '@/components/ui';

/** Form pieces the package and plan editors share. */
export function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text className="text-sm font-bold text-foreground">
      {children}
      {required ? <Text className="text-primary-600"> *</Text> : null}
    </Text>
  );
}

export function ProviderPicker({
  providers,
  selectedId,
  selectedName,
  onSelect,
}: {
  providers: ServiceProvider[];
  selectedId: string;
  selectedName: string;
  onSelect: (provider: ServiceProvider) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <View className="gap-1.5">
      <FieldLabel required>Provider</FieldLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose provider"
        onPress={() => setOpen(!open)}
        className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5"
      >
        <Text className={`text-sm font-medium ${selectedId ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selectedName || 'Select a provider'}
        </Text>
        <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[400]} />
      </Pressable>
      {open
        ? (
            <Card className="border border-border p-1">
              {providers.length === 0
                ? (
                    <Text className="px-4 py-3 text-sm text-muted-foreground">
                      No providers yet — add one from Services first.
                    </Text>
                  )
                : providers.map(provider => (
                    <Pressable
                      key={provider.id}
                      onPress={() => {
                        onSelect(provider);
                        setOpen(false);
                      }}
                      className={`rounded-xl px-4 py-2.5 ${provider.id === selectedId ? 'bg-primary-50 dark:bg-primary-950/60' : ''}`}
                    >
                      <Text className={`text-sm font-semibold ${provider.id === selectedId ? 'text-primary-600' : 'text-foreground'}`}>
                        {provider.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">{provider.serviceName}</Text>
                    </Pressable>
                  ))}
            </Card>
          )
        : null}
    </View>
  );
}
