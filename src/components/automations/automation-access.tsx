import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '@/components/common/screen-header';
import { Text, View } from '@/components/ui';
import { PERMISSIONS } from '@/constants/permissions';
import { usePermissions } from '@/lib/hooks/common/use-permissions';

/** Every automation screen needs `jobs.view`; a deep link without it lands on this instead. */
export function AutomationAccessGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { can, isLoading } = usePermissions();

  if (isLoading)
    return null;

  if (!can(PERMISSIONS.JOBS_VIEW)) {
    return (
      <View className="flex-1 bg-surface">
        <ScreenHeader title={t('automations.forbidden_title')} showBack withSafeArea />
        <Text className="px-6 py-14 text-center text-sm text-muted-foreground">{t('automations.forbidden_message')}</Text>
      </View>
    );
  }

  return <>{children}</>;
}
