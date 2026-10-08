import { ArrowRight01Icon, RemoteControlIcon } from '@hugeicons/core-free-icons';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Card, IconTile } from '@/components/common/shell';
import { Pressable, Text, ThemedIcon, View } from '@/components/ui';

/** The universal remote used to be a tab; it is a shortcut on Home now. */
export function RemoteShortcut() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable accessibilityRole="button" testID="remote-shortcut" onPress={() => router.push('/remote')}>
      <Card className="flex-row items-center gap-3 p-3.5">
        <IconTile icon={RemoteControlIcon} tint="purple" />
        <View className="flex-1">
          <Text className="text-[14px] font-bold text-foreground">{t('remote.public_remote')}</Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>{t('remote.public_remote_desc')}</Text>
        </View>
        <ThemedIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.2} colorClassName="text-muted-foreground" />
      </Card>
    </Pressable>
  );
}
