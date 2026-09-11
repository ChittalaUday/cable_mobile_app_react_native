import * as React from 'react';

import { FocusAwareStatusBar, SafeAreaView, ScrollView } from '@/components/ui';
import { ButtonsDemo } from './components/buttons-demo';
import { ColorsDemo } from './components/colors-demo';
import { InputsDemo } from './components/inputs-demo';
import { Title } from './components/title';
import { TypographyDemo } from './components/typography-demo';

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
