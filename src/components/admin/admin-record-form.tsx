import type { OptionType } from '@/components/ui';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Switch, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button, colors, Pressable, Text, View } from '@/components/ui';

import { useDismissKeyboardOnExit } from '@/lib/hooks/common/use-dismiss-keyboard';

export type FormValue = boolean | string | string[];
export type FormValues = Record<string, FormValue>;
export type FormField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'boolean' | 'multiselect' | 'select' | 'text';
  options?: OptionType[];
  required?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
};

function ChoiceField({ field, value, onChange }: {
  field: FormField;
  value: FormValue;
  onChange: (value: FormValue) => void;
}) {
  const multiple = field.type === 'multiselect';
  const selected = Array.isArray(value) ? value : [value];
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold text-foreground">{field.label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {field.options?.map((option) => {
          const active = selected.includes(String(option.value));
          return (
            <Pressable
              key={option.value}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: active }}
              onPress={() => {
                if (!multiple)
                  return onChange(String(option.value));
                const values = selected.filter(Boolean).map(String);
                onChange(active ? values.filter(item => item !== String(option.value)) : [...values, String(option.value)]);
              }}
              className={`rounded-full px-3 py-2 ${active ? 'bg-primary-500' : 'border border-border bg-card'}`}
            >
              <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-foreground'}`}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AdminRecordForm({ title, fields, initialValues, saving, error, onClose, onSave }: {
  title: string;
  fields: FormField[];
  initialValues: FormValues;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (values: FormValues) => void;
}) {
  const { t } = useTranslation();
  const [values, setValues] = React.useState(initialValues);
  const [missing, setMissing] = React.useState<string[]>([]);

  useDismissKeyboardOnExit();

  const submit = () => {
    const nextMissing = fields.filter(field => field.required && !values[field.key]).map(field => field.key);
    setMissing(nextMissing);
    if (nextMissing.length === 0)
      onSave(values);
  };

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[92%] rounded-t-3xl border-t border-border bg-surface">
          <View className="flex-row items-center gap-3 border-b border-border px-5 py-4">
            <Text className="flex-1 text-xl font-extrabold text-foreground">{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('admin.close')} onPress={onClose} hitSlop={12}>
              <HugeiconsIcon icon={Cancel01Icon} size={22} color={colors.neutral[500]} />
            </Pressable>
          </View>
          <KeyboardAwareScrollView
            contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={24}
          >
            {fields.map((field) => {
              const value = values[field.key] ?? (field.type === 'boolean' ? false : field.type === 'multiselect' ? [] : '');
              if (field.type === 'boolean') {
                return (
                  <View key={field.key} className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <Text className="text-sm font-bold text-foreground">{field.label}</Text>
                    <Switch value={Boolean(value)} onValueChange={next => setValues(current => ({ ...current, [field.key]: next }))} />
                  </View>
                );
              }
              if (field.type === 'select' || field.type === 'multiselect') {
                return (
                  <ChoiceField
                    key={field.key}
                    field={field}
                    value={value}
                    onChange={next => setValues(current => ({ ...current, [field.key]: next }))}
                  />
                );
              }
              return (
                <View key={field.key} className="gap-1">
                  <Text className="text-sm font-bold text-foreground">{field.label}</Text>
                  <TextInput
                    value={String(value)}
                    onChangeText={next => setValues(current => ({ ...current, [field.key]: next }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType={field.keyboardType}
                    multiline={field.key === 'description' || field.key === 'note'}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                  {missing.includes(field.key) ? <Text className="text-xs font-semibold text-danger-500">{t('admin.required')}</Text> : null}
                </View>
              );
            })}
            {error ? <Text selectable className="text-sm font-semibold text-danger-500">{error}</Text> : null}
            <Button label={t('admin.save')} loading={saving} onPress={submit} />
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}
