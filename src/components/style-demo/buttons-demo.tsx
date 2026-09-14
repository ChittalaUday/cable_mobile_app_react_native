import * as React from 'react';
import { Button, View } from '@/components/ui';

export function ButtonsDemo() {
  return (
    <View className="gap-3">
      <Button label="Primary Button" />
      <Button label="Secondary Button" variant="secondary" />
      <Button label="Outline Button" variant="outline" />
      <Button label="Destructive Button" variant="destructive" />
      <Button label="Ghost Button" variant="ghost" />
    </View>
  );
}
