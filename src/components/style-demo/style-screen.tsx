import * as React from 'react';

import { ButtonsDemo } from '@/components/style-demo/buttons-demo';
import { ColorsDemo } from '@/components/style-demo/colors-demo';
import { InputsDemo } from '@/components/style-demo/inputs-demo';
import { Title } from '@/components/style-demo/title';
import { TypographyDemo } from '@/components/style-demo/typography-demo';
import { FocusAwareStatusBar, SafeAreaView, ScrollView } from '@/components/ui';

export function StyleScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <ScrollView className="flex-1" contentContainerClassName="gap-6 p-4">
        <Title text="Typography" />
        <TypographyDemo />
        <Title text="Colors" />
        <ColorsDemo />
        <Title text="Buttons" />
        <ButtonsDemo />
        <Title text="Form Inputs" />
        <InputsDemo />
      </ScrollView>
    </SafeAreaView>
  );
}
