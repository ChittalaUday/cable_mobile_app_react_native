import * as React from 'react';
import { Image, Text, View } from '@/components/ui';
import { IMAGES } from '@/constants';

export function PromoBanner() {
  return (
    <View className="h-24 flex-row items-center overflow-hidden rounded-2xl bg-[#E8F1FB]">
      <Image
        source={IMAGES.operatorHero}
        className="h-24 w-36"
        contentFit="cover"
        contentPosition="bottom right"
      />
      <View className="flex-1 pr-4 pl-2">
        <Text className="text-[15px]/5 font-bold text-charcoal-900">Connecting Homes</Text>
        <Text className="text-[15px]/5 font-bold text-charcoal-900">Building Communities</Text>
        <View className="mt-2 h-1 w-8 rounded-full bg-primary-600" />
      </View>
    </View>
  );
}
