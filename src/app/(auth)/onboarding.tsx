import { useRouter } from 'expo-router';
import * as React from 'react';

import { Cover } from '@/components/onboarding/cover';
import { Button, FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';
import { useIsFirstTime } from '@/lib/hooks/common/use-is-first-time';

export function OnboardingScreen() {
  const [_, setIsFirstTime] = useIsFirstTime();
  const router = useRouter();

  const onGetStarted = () => {
    setIsFirstTime(false);
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <View className="flex-1 justify-between p-6">
        <Cover />
        <Button label="Get Started" onPress={onGetStarted} />
      </View>
    </SafeAreaView>
  );
}

export default OnboardingScreen;
