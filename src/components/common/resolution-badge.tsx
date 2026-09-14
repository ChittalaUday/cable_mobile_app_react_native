import type { ChannelResolution } from '@/lib/api/types';
import { Text, View } from '@/components/ui';

/**
 * SD / HD / 4K, each with its own tint.
 *
 * `channel_resolution` has three values, not two — a screen that asks
 * `resolution === 'HD'` and falls through to "SD" prints the wrong label on
 * every 4K channel.
 */
const STYLE: Record<ChannelResolution, { box: string; text: string }> = {
  'SD': { box: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-600 dark:text-neutral-400' },
  'HD': { box: 'bg-sky-100 dark:bg-sky-950/60', text: 'text-sky-700 dark:text-sky-400' },
  '4K': { box: 'bg-violet-100 dark:bg-violet-950/60', text: 'text-violet-700 dark:text-violet-400' },
};

export function ResolutionBadge({
  resolution,
  size = 'md',
}: {
  resolution: ChannelResolution;
  size?: 'sm' | 'md';
}) {
  const style = STYLE[resolution] ?? STYLE.SD;

  return (
    <View className={`rounded-sm ${size === 'sm' ? 'px-1.5' : 'px-2'} py-0.5 ${style.box}`}>
      <Text className={`${size === 'sm' ? 'text-[10px]' : 'text-[11px]'} font-bold ${style.text}`}>
        {resolution}
      </Text>
    </View>
  );
}
