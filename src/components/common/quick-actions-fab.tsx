import type { Href } from 'expo-router';
import { Cancel01Icon, FlashIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { AnimatePresence, MotiView } from 'moti';
import * as React from 'react';
import { StyleSheet } from 'react-native';

import { ICON_MAP } from '@/components/common/registry-icons';
import { colors, Pressable, Text, View } from '@/components/ui';
import { useAppSearch } from '@/lib/hooks/common/use-app-search';

/**
 * A floating "Quick actions" button that slides the registry's actions up.
 *
 * The list is the same registry global search reads, so a role only ever sees
 * routes under its own layout, and anything the user lacks the permission for
 * is already dropped — nothing here filters by role a second time.
 */
export function QuickActionsFab() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { results } = useAppSearch('');
  const actions = results.filter(item => item.type === 'action');

  if (actions.length === 0)
    return null;

  const run = (route: string) => {
    setOpen(false);
    router.push(route as Href);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <MotiView
            key="backdrop"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 180 }}
            style={StyleSheet.absoluteFill}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close quick actions"
              onPress={() => setOpen(false)}
              className="flex-1 bg-black/40"
            />
          </MotiView>
        )}
      </AnimatePresence>

      <View pointerEvents="box-none" className="absolute right-4 bottom-4 items-end gap-2">
        <AnimatePresence>
          {open && actions.map((item, index) => (
            <MotiView
              key={item.key}
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 16 }}
              // Nearest the button first, so the list unfolds upward from it.
              transition={{ type: 'timing', duration: 180, delay: (actions.length - 1 - index) * 40 }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => run(item.route)}
                className="flex-row items-center gap-2.5 rounded-full bg-card py-2.5 pr-4 pl-3 shadow-sm active:bg-muted"
              >
                <View className="size-8 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-950/60">
                  <HugeiconsIcon icon={(item.icon ? ICON_MAP[item.icon] : undefined) ?? FlashIcon} size={16} color={colors.primary[600]} strokeWidth={2.2} />
                </View>
                <Text className="text-sm font-semibold text-foreground">{item.title}</Text>
              </Pressable>
            </MotiView>
          ))}
        </AnimatePresence>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Cancel' : 'Quick actions'}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(value => !value)}
          className={`flex-row items-center gap-2 rounded-full px-4 py-3 shadow-md ${open ? 'bg-charcoal-800' : 'bg-primary-600 active:bg-primary-700'}`}
        >
          <HugeiconsIcon icon={open ? Cancel01Icon : FlashIcon} size={18} color="#ffffff" strokeWidth={2.4} />
          <Text className="text-sm font-bold text-white">{open ? 'Cancel' : 'Quick actions'}</Text>
        </Pressable>
      </View>
    </>
  );
}
