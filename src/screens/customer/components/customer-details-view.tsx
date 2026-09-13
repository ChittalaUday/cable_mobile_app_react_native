/* eslint-disable max-lines-per-function */
import {
  ArrowLeft02Icon,
  Call02Icon,
  Comment01Icon,
  CreditCardIcon,
  File01Icon,
  Location01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  PrinterIcon,
  Share01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, Image, Pressable, Text } from '@/components/ui';
import { IMAGES } from '@/constants/assets';

export type CustomerDetailsData = {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  area: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  packageName?: string;
  stbSerialNumber?: string;
  vcNumber?: string;
};

export type CustomerDetailsViewProps = {
  customer?: CustomerDetailsData;
  onBack?: () => void;
  role?: 'admin' | 'staff';
};

export function CustomerDetailsView({ customer, onBack, role = 'admin' }: CustomerDetailsViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const data: CustomerDetailsData = customer || {
    id: 'SSCN00101',
    name: 'Ramesh Kumar',
    phone: '9876543210',
    address: '12-3-45, Main Road, Mandapeta',
    area: 'Mandapeta',
    status: 'ACTIVE',
    packageName: 'Standard Cable HD Pack',
    stbSerialNumber: 'STB123456789',
    vcNumber: 'VC987654',
  };

  const handleCall = () => {
    Linking.openURL(`tel:${data.phone}`);
  };

  const handleMessage = () => {
    Linking.openURL(`sms:${data.phone}`);
  };

  const actionItems = [
    {
      id: 'add-payment',
      title: 'Add Payment',
      icon: CreditCardIcon,
      onPress: () => {},
    },
    {
      id: 'view-details',
      title: 'View Customer Details',
      icon: File01Icon,
      onPress: () => {},
    },
    {
      id: 'edit-customer',
      title: 'Edit Customer',
      icon: PencilEdit02Icon,
      onPress: () => {},
    },
    {
      id: 'share-details',
      title: 'Share Details',
      icon: Share01Icon,
      onPress: () => {},
    },
    {
      id: 'print-details',
      title: 'Print Details',
      icon: PrinterIcon,
      onPress: () => {},
    },
  ];

  return (
    <View className="flex-1 bg-[#FFFBF7] dark:bg-neutral-950">
      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Sunset Graphic Banner */}
        <View
          className="relative w-full overflow-hidden bg-orange-100 dark:bg-orange-950"
          style={{ height: 160 + Math.max(insets.top, 20) }}
        >
          <Image
            source={IMAGES.customerDetailsHeaderBg}
            className="absolute inset-0 size-full opacity-95"
            contentFit="cover"
          />

          {/* Top Bar Overlay with Safe Area Inset */}
          <View
            className="absolute top-0 right-0 left-0 flex-row items-center justify-between px-4"
            style={{ paddingTop: Math.max(insets.top + 8, 20) }}
          >
            <Pressable
              onPress={onBack || (() => router.back())}
              className="size-10 items-center justify-center rounded-full bg-white/80 dark:bg-black/60"
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} color={colors.neutral[800]} />
            </Pressable>

            <Pressable className="size-10 items-center justify-center rounded-full bg-white/80 dark:bg-black/60">
              <HugeiconsIcon icon={MoreHorizontalIcon} size={20} color={colors.neutral[800]} />
            </Pressable>
          </View>
        </View>

        {/* Customer Profile Card */}
        <View className="mx-5 -mt-10 items-center rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="size-20 items-center justify-center rounded-full border-2 border-[#F95716]/30 bg-[#FFF2EB] dark:bg-orange-950/40">
            <Text className="text-2xl font-extrabold text-[#F95716] dark:text-orange-400">
              {data.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>

          <Text className="mt-3 text-xl font-extrabold text-neutral-900 dark:text-white">
            {data.name}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            {data.id}
          </Text>

          {/* Status Pill */}
          <View className="mt-2 flex-row items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
            <View className="mr-1.5 size-2 rounded-full bg-emerald-500" />
            <Text className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
              Active
            </Text>
          </View>

          {/* Quick Round Buttons */}
          <View className="mt-5 w-full flex-row items-center justify-around border-t border-neutral-100 pt-4 dark:border-neutral-800">
            {[
              { label: 'Call', icon: Call02Icon, onPress: handleCall },
              { label: 'Message', icon: Comment01Icon, onPress: handleMessage },
              { label: 'Directions', icon: Location01Icon, onPress: () => {} },
              { label: 'More', icon: MoreHorizontalIcon, onPress: () => {} },
            ].map(btn => (
              <Pressable
                key={btn.label}
                onPress={btn.onPress}
                className="items-center"
              >
                <View className="size-11 items-center justify-center rounded-full border border-neutral-200 bg-[#FFF5EE] active:bg-orange-200 dark:border-neutral-700 dark:bg-neutral-800">
                  <HugeiconsIcon icon={btn.icon} size={18} color="#F95716" />
                </View>
                <Text className="mt-1.5 text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                  {btn.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quick Actions List Items */}
        <View className="mx-5 mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="border-b border-neutral-100 p-4 text-xs font-extrabold tracking-wider text-neutral-500 uppercase dark:border-neutral-800 dark:text-neutral-400">
            Quick Actions (
            {role.toUpperCase()}
            )
          </Text>

          <View className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {actionItems.map(item => (
              <Pressable
                key={item.id}
                onPress={item.onPress}
                className="flex-row items-center justify-between p-4 active:bg-neutral-100 dark:active:bg-neutral-800/50"
              >
                <View className="flex-row items-center">
                  <View className="size-9 items-center justify-center rounded-xl bg-[#FFF2EB] dark:bg-orange-950/40">
                    <HugeiconsIcon icon={item.icon} size={18} color="#F95716" />
                  </View>
                  <Text className="ml-3.5 text-sm font-bold text-neutral-800 dark:text-white">
                    {item.title}
                  </Text>
                </View>
                <Text className="text-sm text-neutral-400">›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
