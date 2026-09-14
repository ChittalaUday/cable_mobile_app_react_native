import * as React from 'react';
import { Text } from '@/components/ui';

export function Title({ text }: { text: string }) {
  return <Text className="py-2 text-lg font-bold text-foreground">{text}</Text>;
}
