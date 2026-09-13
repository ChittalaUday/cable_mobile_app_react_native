/* eslint-disable max-lines-per-function */
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { ConnectionAccount, ConsolidatedCustomer } from '@/types/customer-connection';
import {
  AlertCircleIcon,
  Call02Icon,
  CheckmarkCircle02Icon,
  Location01Icon,
  Tv01Icon,
  Wifi01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView } from 'react-native';

import { Card, Divider, StatusPill, TINT } from '@/components/common/shell';
import { Button, colors, Pressable, Text, View } from '@/components/ui';
import { initials } from '@/lib/utils/admin-format';

export type CustomerConnectionCardProps = {
  customer: ConsolidatedCustomer;
  onRecharge?: (connection: ConnectionAccount) => void;
  onRaiseTicket?: (customer: ConsolidatedCustomer, connection: ConnectionAccount) => void;
  onViewDetails?: (customer: ConsolidatedCustomer) => void;
  defaultActiveIndex?: number;
};

function getServiceIcon(type?: string) {
  if (type === 'internet' || type === 'apfiber' || type === 'broadband') {
    return Wifi01Icon;
  }
  return Tv01Icon;
}

function ConnectionHeader({
  customer,
  connectionsCount,
  onPress,
}: {
  customer: ConsolidatedCustomer;
  connectionsCount: number;
  onPress?: () => void;
}) {
  const isMulti = connectionsCount > 1;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-start justify-between gap-2 active:opacity-80"
    >
      <View className="flex-1 flex-row items-center gap-2.5">
        <View
          className="size-10 items-center justify-center rounded-full"
          style={{ backgroundColor: TINT.blue.bg }}
        >
          <Text className="text-xs font-extrabold" style={{ color: TINT.blue.fg }}>
            {initials(customer.name)}
          </Text>
        </View>

        <View className="flex-1 gap-0.5">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-[15px] font-extrabold text-foreground" numberOfLines={1}>
              {customer.name}
            </Text>
            {isMulti
              ? (
                  <View className="rounded-full bg-primary-100 px-2.5 py-0.5 dark:bg-neutral-800">
                    <Text className="text-xs font-extrabold text-primary-600 dark:text-primary-400">
                      {connectionsCount}
                      {' '}
                      Connections
                    </Text>
                  </View>
                )
              : null}
          </View>

          <View className="flex-row flex-wrap items-center gap-3">
            <View className="flex-row items-center gap-1.5">
              <HugeiconsIcon icon={Call02Icon} size={13} color={colors.neutral[500]} />
              <Text className="text-[11px] font-semibold text-muted-foreground">{customer.phone}</Text>
            </View>
            {customer.address
              ? (
                  <View className="flex-row items-center gap-1.5">
                    <HugeiconsIcon icon={Location01Icon} size={13} color={colors.neutral[500]} />
                    <Text className="text-[11px] font-medium text-muted-foreground" numberOfLines={1}>
                      {customer.address}
                    </Text>
                  </View>
                )
              : null}
          </View>
        </View>
      </View>

      <StatusPill status={customer.status} />
    </Pressable>
  );
}

function ConnectionPillSwitcher({
  connections,
  activeIndex,
  onSelect,
}: {
  connections: ConnectionAccount[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <View className="mt-3 flex-row flex-wrap gap-2 rounded-xl border border-border bg-neutral-50 p-2 dark:bg-neutral-900/50">
      {connections.map((conn, index) => {
        const isSelected = index === activeIndex;
        const ServiceIcon = getServiceIcon(conn.serviceType);
        return (
          <Pressable
            key={conn.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(index)}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg px-3 py-2 ${
              isSelected ? 'bg-primary-500' : 'bg-transparent'
            }`}
          >
            <HugeiconsIcon
              icon={ServiceIcon}
              size={16}
              color={isSelected ? '#ffffff' : colors.neutral[500]}
            />
            <Text
              className={`text-xs font-bold ${
                isSelected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
              }`}
              numberOfLines={1}
            >
              {conn.locationLabel ?? conn.serviceTypeName}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ConnectionCardItem({
  connection,
  onPress,
}: {
  connection: ConnectionAccount;
  onPress?: () => void;
}) {
  const isAct = connection.status === 'active';
  const serviceName = connection.serviceTypeName || (connection.serviceType === 'internet' ? 'Broadband' : 'Cable TV');
  const boxInfo = connection.stbNumber ?? connection.vcNumber;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="mt-2.5 rounded-xl border border-border bg-card p-3 active:opacity-90"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3 pr-2">
          <View className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
            <HugeiconsIcon
              icon={getServiceIcon(connection.serviceType)}
              size={18}
              color={colors.primary[500]}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-foreground" numberOfLines={1}>
              {serviceName}
            </Text>
            <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1}>
              {connection.packageName || connection.locationLabel || 'Standard Pack'}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <View className="flex-row items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
            <HugeiconsIcon
              icon={isAct ? CheckmarkCircle02Icon : AlertCircleIcon}
              size={14}
              color={isAct ? colors.success[500] : colors.warning[500]}
            />
            <Text className="text-xs font-bold text-muted-foreground capitalize">
              {connection.status}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-2.5 flex-row flex-wrap gap-2 border-t border-border/60 pt-2.5">
        {boxInfo
          ? (
              <View className="min-w-[110px] flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5">
                <Text className="text-[11px] font-semibold text-muted-foreground">Box / STB</Text>
                <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                  {boxInfo}
                </Text>
              </View>
            )
          : null}

        <View className="min-w-[100px] flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <Text className="text-[11px] font-semibold text-muted-foreground">Due Amount</Text>
          <Text className="text-sm font-extrabold text-primary-600 dark:text-primary-400" numberOfLines={1}>
            {`${connection.currency ?? '₹'}${connection.monthlyPrice}/mo`}
          </Text>
        </View>

        {connection.expiryDate
          ? (
              <View className="min-w-[110px] flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5">
                <Text className="text-[11px] font-semibold text-muted-foreground">Expiry Date</Text>
                <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                  {connection.expiryDate}
                </Text>
              </View>
            )
          : null}

        {connection.speedMbps
          ? (
              <View className="rounded-lg border border-border bg-surface px-2.5 py-1.5">
                <Text className="text-[11px] font-semibold text-muted-foreground">Speed</Text>
                <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                  {connection.speedMbps}
                  {' '}
                  Mbps
                </Text>
              </View>
            )
          : null}
      </View>
    </Pressable>
  );
}

function CardActionFooter({
  customer,
  activeConnection,
  onRecharge,
  onRaiseTicket,
  onViewDetails,
}: {
  customer: ConsolidatedCustomer;
  activeConnection?: ConnectionAccount;
  onRecharge?: (connection: ConnectionAccount) => void;
  onRaiseTicket?: (customer: ConsolidatedCustomer, connection: ConnectionAccount) => void;
  onViewDetails: (customer: ConsolidatedCustomer) => void;
}) {
  return (
    <View className="flex-row items-center gap-2">
      {onRecharge && activeConnection
        ? (
            <View className="flex-1">
              <Button
                label="Recharge"
                size="sm"
                onPress={() => onRecharge(activeConnection)}
              />
            </View>
          )
        : null}

      {onRaiseTicket && activeConnection
        ? (
            <View className="flex-1">
              <Button
                label="Raise Ticket"
                variant="outline"
                size="sm"
                onPress={() => onRaiseTicket(customer, activeConnection)}
              />
            </View>
          )
        : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => onViewDetails(customer)}
        className="h-8 items-center justify-center rounded-lg border border-border px-3"
      >
        <Text className="text-xs font-bold text-foreground">View</Text>
      </Pressable>
    </View>
  );
}

export function CustomerConnectionCard({
  customer,
  onRecharge,
  onRaiseTicket,
  onViewDetails,
  defaultActiveIndex = 0,
}: CustomerConnectionCardProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = React.useState(defaultActiveIndex);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const connections = customer.connections ?? [];
  const activeConnection: ConnectionAccount | undefined = connections[activeIndex] ?? connections[0];
  const isMultiConnection = connections.length > 1;

  const handleSelectPill = (index: number) => {
    setActiveIndex(index);
    if (containerWidth > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: index * containerWidth, animated: true });
    }
  };

  const handleViewCustomerDetails = () => {
    if (onViewDetails) {
      onViewDetails(customer);
      return;
    }
    router.push(`/customer-details/${customer.id}`);
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerWidth <= 0) {
      return;
    }
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / containerWidth);
    if (index >= 0 && index < connections.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  return (
    <Card className="p-3">
      <ConnectionHeader
        customer={customer}
        connectionsCount={connections.length}
        onPress={handleViewCustomerDetails}
      />

      {isMultiConnection
        ? (
            <ConnectionPillSwitcher
              connections={connections}
              activeIndex={activeIndex}
              onSelect={handleSelectPill}
            />
          )
        : null}

      <View onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}>
        {containerWidth > 0 && isMultiConnection
          ? (
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                nestedScrollEnabled
                decelerationRate="fast"
              >
                {connections.map(conn => (
                  <View key={conn.id} style={{ width: containerWidth }}>
                    <ConnectionCardItem connection={conn} onPress={handleViewCustomerDetails} />
                  </View>
                ))}
              </ScrollView>
            )
          : activeConnection
            ? (
                <ConnectionCardItem connection={activeConnection} onPress={handleViewCustomerDetails} />
              )
            : null}
      </View>

      {isMultiConnection
        ? (
            <View className="mt-2 flex-row items-center justify-center gap-1.5">
              {connections.map((conn, idx) => (
                <View
                  key={conn.id}
                  className={`h-1.5 rounded-full ${
                    idx === activeIndex ? 'w-4 bg-primary-500' : 'w-1.5 bg-neutral-300 dark:bg-neutral-700'
                  }`}
                />
              ))}
            </View>
          )
        : null}

      <Divider className="my-2.5" />

      <CardActionFooter
        customer={customer}
        activeConnection={activeConnection}
        onRecharge={onRecharge}
        onRaiseTicket={onRaiseTicket}
        onViewDetails={handleViewCustomerDetails}
      />
    </Card>
  );
}
