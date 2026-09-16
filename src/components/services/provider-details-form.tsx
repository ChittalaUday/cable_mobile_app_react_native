import type { Service } from '@/lib/api/types';
import { Add01Icon, ArrowDown01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Switch, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Card } from '@/components/common/shell';
import { colors, Pressable, Text, View } from '@/components/ui';

/**
 * A service is only removable while nothing supplies it.
 *
 * `providerCount` counts *active* providers, but the API blocks deletion on any
 * provider at all — so an inactive one would make this look deletable and then
 * 409. The full `providers` list is the honest test.
 */
function canDeleteService(service: Service) {
  return (service.providers?.length ?? service.providerCount) === 0;
}

function describeService(service: Service) {
  const total = service.providers?.length ?? service.providerCount;
  if (total === 0)
    return 'No providers yet';

  const inactive = total - service.providerCount;
  return `${total} ${total === 1 ? 'provider' : 'providers'}${inactive > 0 ? ` · ${inactive} inactive` : ''}`;
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text className="text-sm font-bold text-foreground">
      {children}
      {required ? <Text className="text-primary-600"> *</Text> : null}
    </Text>
  );
}

export type ProviderDraft = {
  name: string;
  serviceId: string | null;
  code: string;
  phone: string;
  website: string;
  description: string;
  isDefault: boolean;
};

/**
 * Step one: who the provider is, and which service it supplies.
 *
 * The service is picked rather than typed — a second supplier of Cable TV is a
 * provider row, never a second service — and can be created or retired from
 * inside the same list, so nobody has to leave the form to add one.
 */

export function ProviderDetailsForm({
  draft,
  onChange,
  errors,
  services,
  onAddService,
  onDeleteService,
}: {
  draft: ProviderDraft;
  onChange: <K extends keyof ProviderDraft>(key: K, value: ProviderDraft[K]) => void;
  errors: Record<string, string>;
  services: Service[];
  onAddService: () => void;
  onDeleteService: (service: Service) => void;
}) {
  const [servicesOpen, setServicesOpen] = React.useState(false);
  const service = services.find(item => item.id === draft.serviceId);

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, paddingHorizontal: 16 }}
      contentContainerStyle={{ gap: 16, paddingTop: 8, paddingBottom: 112 }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1.5">
        <FieldLabel required>Provider Name</FieldLabel>
        <TextInput
          value={draft.name}
          onChangeText={value => onChange('name', value)}
          placeholder="e.g. ACT Fibernet"
          placeholderTextColor={colors.neutral[400]}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
        />
        {errors.name ? <Text className="text-xs text-danger-500">{errors.name}</Text> : null}
      </View>

      <View className="gap-1.5">
        <FieldLabel required>Service</FieldLabel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose service"
          onPress={() => setServicesOpen(!servicesOpen)}
          className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5"
        >
          <Text className={`text-sm font-medium ${service ? 'text-foreground' : 'text-muted-foreground'}`}>
            {service?.name ?? 'Select a service'}
          </Text>
          <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[400]} />
        </Pressable>
        {servicesOpen
          ? (
              <Card className="border border-border p-1">
                {services.length === 0
                  ? (
                      <Text className="px-4 py-3 text-sm text-muted-foreground">
                        No services defined for this network yet.
                      </Text>
                    )
                  : services.map(item => (
                      <View
                        key={item.id}
                        className={`flex-row items-center rounded-xl pr-1 ${
                          item.id === draft.serviceId ? 'bg-primary-50 dark:bg-primary-950/60' : ''
                        }`}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: item.id === draft.serviceId }}
                          onPress={() => {
                            onChange('serviceId', item.id);
                            setServicesOpen(false);
                          }}
                          className="flex-1 px-4 py-2.5"
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              item.id === draft.serviceId ? 'text-primary-600' : 'text-foreground'
                            }`}
                          >
                            {item.name}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {describeService(item)}
                          </Text>
                        </Pressable>

                        {/*
                      Only offered when nothing supplies the service: the
                      API refuses to retire one that still has providers,
                      and a button that always 409s is worse than none.
                    */}
                        {canDeleteService(item)
                          ? (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Delete ${item.name}`}
                                onPress={() => onDeleteService(item)}
                                hitSlop={8}
                                className="size-8 items-center justify-center rounded-lg"
                              >
                                <HugeiconsIcon
                                  icon={Delete02Icon}
                                  size={16}
                                  color={colors.danger[500]}
                                  strokeWidth={2}
                                />
                              </Pressable>
                            )
                          : null}
                      </View>
                    ))}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setServicesOpen(false);
                    onAddService();
                  }}
                  className="mt-1 flex-row items-center gap-2 border-t border-border px-4 py-3 active:bg-muted/40"
                >
                  <HugeiconsIcon icon={Add01Icon} size={16} color={colors.primary[600]} strokeWidth={2.4} />
                  <Text className="text-sm font-bold text-primary-600">Add a service</Text>
                </Pressable>
              </Card>
            )
          : null}
        {errors.service ? <Text className="text-xs text-danger-500">{errors.service}</Text> : null}
      </View>

      <View className="gap-1.5">
        <FieldLabel>Code (Optional)</FieldLabel>
        <TextInput
          value={draft.code}
          onChangeText={value => onChange('code', value)}
          autoCapitalize="characters"
          placeholder="e.g. ACT"
          placeholderTextColor={colors.neutral[400]}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
        />
      </View>

      <View className="gap-1.5">
        <FieldLabel>Contact Number</FieldLabel>
        <TextInput
          value={draft.phone}
          onChangeText={value => onChange('phone', value)}
          keyboardType="phone-pad"
          placeholder="e.g. 1800 208 6633"
          placeholderTextColor={colors.neutral[400]}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
        />
      </View>

      <View className="gap-1.5">
        <FieldLabel>Website</FieldLabel>
        <TextInput
          value={draft.website}
          onChangeText={value => onChange('website', value)}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://"
          placeholderTextColor={colors.neutral[400]}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
        />
      </View>

      <View className="gap-1.5">
        <FieldLabel>Description</FieldLabel>
        <TextInput
          value={draft.description}
          onChangeText={value => onChange('description', value)}
          placeholder="What this provider delivers..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholderTextColor={colors.neutral[400]}
          className="min-h-[84px] rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
        />
      </View>

      <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-bold text-foreground">Default for this service</Text>
          <Text className="text-xs text-muted-foreground">Preselected when adding a customer</Text>
        </View>
        <Switch
          value={draft.isDefault}
          onValueChange={value => onChange('isDefault', value)}
          trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
          thumbColor="#ffffff"
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
