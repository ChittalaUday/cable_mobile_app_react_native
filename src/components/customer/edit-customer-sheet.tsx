import type { CustomerDetail } from '@/lib/api/types';
import type { UpdateCustomerPayload } from '@/lib/hooks/api/use-customers';
import * as React from 'react';
import { Modal as RNModal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { z } from 'zod';
import { dialogs } from '@/components/common/dialogs';
import { Button, Input, Pressable, Text, View } from '@/components/ui';
import { useUpdateCustomer } from '@/lib/hooks/api/use-customers';

const STATUSES = ['active', 'inactive', 'pending'] as const;
const phone = z.string().regex(/^\d{10}$/, 'Enter a 10-digit number');
const optionalPhone = z.union([z.literal(''), phone]);

/** The same bounds `PATCH /customers/:id` enforces, checked before the round trip. */
const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  phone,
  alternatePhone: optionalPhone,
  status: z.enum(STATUSES),
  address: z.string().max(500),
  notes: z.string().max(2000),
});

type Values = z.infer<typeof schema>;

function valuesOf(customer: CustomerDetail): Values {
  return {
    name: customer.name ?? '',
    phone: customer.phone ?? '',
    alternatePhone: customer.alternatePhone ?? '',
    status: customer.status,
    address: customer.address ?? '',
    notes: customer.notes ?? '',
  };
}

/** Only what changed, so a stale screen cannot overwrite a field somebody else just corrected. */
function changedFields(before: Values, after: Values): UpdateCustomerPayload {
  const patch: Record<string, string | null> = {};
  for (const key of Object.keys(after) as (keyof Values)[]) {
    const value = key === 'name' ? after.name.trim() : after[key];
    if (value === before[key])
      continue;
    const clearable = key === 'alternatePhone' || key === 'address' || key === 'notes';
    patch[key] = clearable && value.trim() === '' ? null : value;
  }
  return patch as UpdateCustomerPayload;
}

export function EditCustomerSheet({ customer, onClose }: { customer: CustomerDetail | null; onClose: () => void }) {
  if (customer === null)
    return null;
  // Keyed on the record, so reopening starts from what the server now says.
  return <Sheet key={customer.updatedAt} customer={customer} onClose={onClose} />;
}

function Sheet({ customer, onClose }: { customer: CustomerDetail; onClose: () => void }) {
  const initial = React.useMemo(() => valuesOf(customer), [customer]);
  const [values, setValues] = React.useState(initial);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Values, string>>>({});
  const { mutate: update, isPending } = useUpdateCustomer();

  const set = (key: keyof Values) => (text: string) => setValues(prev => ({ ...prev, [key]: text }));

  const submit = () => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path[0], issue.message])));
      return;
    }
    setErrors({});
    const payload = changedFields(initial, parsed.data);
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    update({ id: customer.id, payload }, {
      onSuccess: () => {
        onClose();
        void dialogs.notify('Customer updated', 'The changes are saved.');
      },
      onError: failure => void dialogs.notify('Not saved', failure.message || 'Nothing was changed.'),
    });
  };

  return (
    <RNModal animationType="slide" transparent visible onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[92%] rounded-t-3xl border-t border-border bg-card">
          <View className="border-b border-border/60 px-5 py-4">
            <Text className="text-xl font-extrabold text-foreground">Edit customer</Text>
            <Text className="text-xs text-muted-foreground">{customer.customerCode ?? customer.name}</Text>
          </View>

          <KeyboardAwareScrollView
            style={{ paddingHorizontal: 20, paddingVertical: 16 }}
            contentContainerStyle={{ gap: 4, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={24}
          >
            <Input label="Name" value={values.name} onChangeText={set('name')} error={errors.name} testID="edit-name" />
            <Input label="Phone" value={values.phone} onChangeText={set('phone')} error={errors.phone} keyboardType="phone-pad" maxLength={10} testID="edit-phone" />
            <Input label="Alternate phone" value={values.alternatePhone} onChangeText={set('alternatePhone')} error={errors.alternatePhone} keyboardType="phone-pad" maxLength={10} testID="edit-alternate-phone" />

            <Text className="mt-2 mb-1.5 text-sm font-bold text-foreground">Status</Text>
            <View className="mb-2 flex-row gap-2">
              {STATUSES.map(option => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: values.status === option }}
                  onPress={() => setValues(prev => ({ ...prev, status: option }))}
                  className={`rounded-full border px-3.5 py-2 ${values.status === option ? 'border-primary-500 bg-primary-500' : 'border-border bg-card'}`}
                >
                  <Text className={`text-xs font-bold capitalize ${values.status === option ? 'text-white' : 'text-foreground'}`}>{option}</Text>
                </Pressable>
              ))}
            </View>

            <Input label="Address" value={values.address} onChangeText={set('address')} error={errors.address} multiline numberOfLines={2} testID="edit-address" />
            <Input label="Notes" value={values.notes} onChangeText={set('notes')} error={errors.notes} multiline numberOfLines={3} testID="edit-notes" />
          </KeyboardAwareScrollView>

          <View className="flex-row gap-3 border-t border-border/60 px-5 py-4">
            <View className="flex-1">
              <Button label="Cancel" variant="outline" size="lg" onPress={onClose} />
            </View>
            <View className="flex-1">
              <Button label={isPending ? 'Saving…' : 'Save'} size="lg" disabled={isPending} onPress={submit} testID="edit-submit" />
            </View>
          </View>
        </View>
      </View>
    </RNModal>
  );
}
