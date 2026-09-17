import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/common/screen-header';
import { RemoteControl } from '@/components/remote/remote-control';
import { FocusAwareStatusBar, SafeAreaView, ScrollView, View } from '@/components/ui';

export default function PublicRemoteScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface">
        <ScreenHeader
          title={t('remote.public_remote')}
          subtitle={t('remote.public_remote_desc')}
          showBack
        />
      </SafeAreaView>
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="p-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <RemoteControl />
      </ScrollView>
    </View>
  );
}
