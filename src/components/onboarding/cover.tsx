import * as React from 'react';
import { Image, Text, View } from '@/components/ui';
import { IMAGES } from '@/constants';

export function Cover() {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Image
        source={IMAGES.onboardingHero}
        className="h-64 w-full"
        contentFit="contain"
      />
      <Text className="mt-8 text-center text-2xl font-bold text-foreground">Welcome to Satya Cable</Text>
      <Text className="mt-2 text-center text-sm text-muted-foreground">Manage your broadband & cable subscriptions effortlessly.</Text>
    </View>
  );
}
