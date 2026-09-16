import {
  CreditCardIcon,
  Home01Icon,
  MoreIcon,
  RemoteControlIcon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Tabs } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { colors } from '@/components/ui';

export default function AdminTabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.neutral[200],
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <HugeiconsIcon icon={Home01Icon} size={21} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, focused }) => (
            <HugeiconsIcon icon={UserMultipleIcon} size={21} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, focused }) => (
            <HugeiconsIcon icon={CreditCardIcon} size={21} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="remote"
        options={{
          title: t('remote.tab'),
          tabBarIcon: ({ color, focused }) => (
            <HugeiconsIcon icon={RemoteControlIcon} size={21} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <HugeiconsIcon icon={MoreIcon} size={21} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
    </Tabs>
  );
}
