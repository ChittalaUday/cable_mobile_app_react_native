import { useRouter } from 'expo-router';
import * as React from 'react';

import { Button, FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';
import { Cover } from './components/cover';

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
