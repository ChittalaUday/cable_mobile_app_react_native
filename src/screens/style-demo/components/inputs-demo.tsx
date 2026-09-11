import * as React from 'react';
import { Checkbox, Input, Select, View } from '@/components/ui';

export function InputsDemo() {
  const [checked, setChecked] = React.useState(false);
  const options = React.useMemo(() => [
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' },
  ], []);

  return (
    <View className="gap-3">
      <Input placeholder="Standard Input" />
      <Input placeholder="Disabled Input" disabled />
      <Select label="Select Option" options={options} />
      <Checkbox label="Checkbox Option" accessibilityLabel="Checkbox Option" checked={checked} onChange={setChecked} />
    </View>
  );
}
