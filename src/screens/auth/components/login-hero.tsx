import { Tv01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import * as React from 'react';

import { LanguageToggle } from '@/components/common/language-toggle';
import { colors, Image, SafeAreaView, Text, View } from '@/components/ui';
import { IMAGES } from '@/constants';
import { translate } from '@/lib/i18n';

export function LoginHero() {
  return (
    <View className="h-[32%] min-h-[200px] overflow-hidden bg-neutral-100">
      <Image
        source={IMAGES.loginHero}
        className="absolute inset-0 size-full"
        contentFit="contain"
        contentPosition="bottom right"
      />
      <LinearGradient
        className="absolute inset-0"
        colors={[colors.neutral[50], `${colors.neutral[50]}D9`, 'transparent']}
        locations={[0, 0.34, 0.68]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      <SafeAreaView edges={['top']}>
        <MotiView
          className="px-5 pt-3"
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <View className="flex-row items-center gap-3">
            <View className="size-11 items-center justify-center rounded-2xl bg-primary-600">
              <HugeiconsIcon icon={Tv01Icon} size={24} color="#fff" strokeWidth={2} />
            </View>
            <View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xl font-extrabold text-foreground">{translate('login.brand')}</Text>
                <LanguageToggle />
              </View>
              <Text className="text-xs text-muted-foreground">{translate('login.brand_subtitle')}</Text>
            </View>
          </View>

          <View className="mt-6 w-[54%]">
            <Text className="text-[22px]/tight font-extrabold text-foreground">{translate('login.tagline')}</Text>
            <Text className="text-[22px]/tight font-extrabold text-primary-600">{translate('login.tagline_accent')}</Text>
            <Text className="mt-2 text-xs/snug text-muted-foreground">{translate('login.tagline_sub')}</Text>
          </View>
        </MotiView>
      </SafeAreaView>
    </View>
  );
}
