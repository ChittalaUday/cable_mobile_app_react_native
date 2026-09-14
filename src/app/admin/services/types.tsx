import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Service } from '@/lib/api/types';
import {
  Add01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  Location01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, RefreshControl } from 'react-native';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Card, Loading } from '@/components/common/shell';
import { ServiceFormSheet } from '@/components/services/service-form-sheet';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from '@/components/ui';
import { useDeleteService, useServices } from '@/lib/hooks/api/use-services';
import { serviceIcon } from '@/lib/service-icons';

/**
 * The service types a tenant sells — Cable TV, Broadband — and nothing else.
 *
 * Split off the provider list because the two read as one list of unrelated
 * things when stacked: a service is what a subscriber buys, a provider is who
 * supplies it, and the provider list is the one an operator works in daily.
 * This screen is the occasional one, so it sits behind an icon rather than
 * taking half of the screen that gets used.
 *
 * A service is also the level coverage can be set at above any one supplier,
 * which is the other reason it needs somewhere of its own to be tapped.
 */
function ServiceRow({
  service,
  onCoverage,
  onDelete,
}: {
  service: Service;
  onCoverage: () => void;
  onDelete: () => void;
}) {
  const providers = service.providerCount;

  return (
    <Card className="border border-border p-3.5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Set where ${service.name} is sold`}
        onPress={onCoverage}
        className="flex-row items-center justify-between"
      >
        <View className="flex-1 flex-row items-center gap-3 pr-2">
          <View className="dark:bg-primary-950/60 size-11 items-center justify-center rounded-2xl bg-primary-50">
            <HugeiconsIcon
              icon={serviceIcon(service.icon)}
              size={21}
              color={colors.primary[600]}
              strokeWidth={2.2}
            />
          </View>

          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {service.name}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
              {providers === 0
                ? 'No providers yet'
                : `${providers} ${providers === 1 ? 'provider' : 'providers'}`}
              {' · tap to set where it is sold'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1">
          <View className="size-8 items-center justify-center rounded-lg border border-border bg-surface">
            <HugeiconsIcon icon={Location01Icon} size={16} color={colors.primary[600]} strokeWidth={2.2} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${service.name}`}
            onPress={onDelete}
            hitSlop={8}
            className="size-8 items-center justify-center rounded-lg border border-border bg-surface"
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} color={colors.danger[500]} strokeWidth={2.2} />
          </Pressable>
        </View>
      </Pressable>
    </Card>
  );
}

function Header({ onBack, onAdd }: { onBack: () => void; onAdd: () => void }) {
  return (
    <SafeAreaView edges={['top']} className="bg-surface">
      <View className="flex-row items-center justify-between px-3 pt-1 pb-3">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            className="size-9 items-center justify-center rounded-lg border border-border bg-card"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-foreground">Services</Text>
            <Text className="text-xs text-muted-foreground">
              What subscribers buy, not who supplies it
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add service"
          onPress={onAdd}
          className="size-10 items-center justify-center rounded-full bg-primary-600 active:bg-primary-700"
        >
          <HugeiconsIcon icon={Add01Icon} size={22} color="#ffffff" strokeWidth={2.4} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function ServiceTypesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sheet = React.useRef<BottomSheetModal>(null);

  const { data: services = [], isPending, refetch, isRefetching } = useServices();
  const deleteService = useDeleteService();

  const [pendingDelete, setPendingDelete] = React.useState<Service | null>(null);

  const confirmDelete = async () => {
    if (!pendingDelete)
      return;

    try {
      await deleteService.mutateAsync({ id: pendingDelete.id });
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      setPendingDelete(null);
    }
    catch (err) {
      // A service with providers on it is a 409 from the API, which is the
      // only place that can know — so the message it sends is the one to show.
      setPendingDelete(null);
      Alert.alert('Could not delete service', (err as Error).message || 'Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <Header onBack={() => router.back()} onAdd={() => sheet.current?.present()} />

      <FlashList
        data={services}
        keyExtractor={svc => svc.id}
        renderItem={({ item }) => (
          <ServiceRow
            service={item}
            onCoverage={() => router.push(
              `/coverage?scope=service&id=${item.id}&name=${encodeURIComponent(item.name)}`,
            )}
            onDelete={() => setPendingDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary[600]}
          />
        )}
        ListEmptyComponent={
          isPending
            ? <Loading />
            : (
                <View className="items-center justify-center rounded-2xl border border-border bg-card px-4 py-12">
                  <Text className="text-sm font-semibold text-foreground">No services yet</Text>
                  <Text className="mt-1 text-center text-xs text-muted-foreground">
                    Add one — Cable TV, Broadband — then add the providers that supply it.
                  </Text>
                </View>
              )
        }
      />

      <ServiceFormSheet
        ref={sheet}
        onCreated={() => sheet.current?.dismiss()}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        busy={deleteService.isPending}
        title="Delete service"
        message={
          (pendingDelete?.providerCount ?? 0) > 0
            ? `${pendingDelete?.name ?? 'This service'} has providers supplying it. Remove them first.`
            : `Delete ${pendingDelete?.name ?? ''}? Nothing supplies it, so nothing on sale is affected.`
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

export default ServiceTypesScreen;
