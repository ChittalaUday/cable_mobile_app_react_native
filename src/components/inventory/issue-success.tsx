import {
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Card, ScreenHeader } from '@/components/common/shell';
import {
  Button,
  Text,
  View,
} from '@/components/ui';

export function IssueSuccessScreen({
  itemName,
  serialNumber,
  customerName,
  basePath,
}: {
  itemName: string;
  serialNumber: string;
  customerName: string;
  basePath: '/admin/inventory' | '/staff/inventory';
}) {
  const router = useRouter();

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Success"
        subtitle="Equipment issued successfully"
        showBack
        onBack={() => router.replace(basePath)}
        withSafeArea
      />

      <View className="flex-1 items-center justify-center p-6">
        {/* Success Icon */}
        <View className="size-24 items-center justify-center rounded-full bg-success-500">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={54} color="#ffffff" strokeWidth={2.4} />
        </View>

        {/* Heading */}
        <Text className="mt-6 text-center text-2xl font-black text-foreground">
          Equipment Issued Successfully
        </Text>

        {/* Summary Description */}
        <Text className="mt-2 text-center text-sm/relaxed text-muted-foreground">
          <Text className="font-bold text-foreground">{itemName}</Text>
          {' '}
          (
          {serialNumber}
          ) assigned to
          {' '}
          <Text className="font-bold text-foreground">{customerName}</Text>
          .
        </Text>

        {/* Card info */}
        <Card className="mt-8 w-full max-w-sm gap-2 border border-border p-4">
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">Equipment</Text>
            <Text className="text-xs font-bold text-foreground">{itemName}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">Serial Number</Text>
            <Text className="font-mono text-xs font-medium text-foreground">{serialNumber}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">Assigned Customer</Text>
            <Text className="text-xs font-bold text-foreground">{customerName}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">Status</Text>
            <Text className="text-xs font-bold text-success-600">Active / Allocated</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View className="mt-8 w-full max-w-sm gap-3">
          <Button
            label="Issue Another"
            className="bg-primary-600"
            onPress={() => router.replace(`${basePath}/issue`)}
          />
          <Button
            label="View Assignment"
            variant="outline"
            onPress={() => router.replace(basePath)}
          />
        </View>
      </View>
    </View>
  );
}
