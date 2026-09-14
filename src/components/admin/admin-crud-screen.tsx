import type { TFunction } from 'i18next';
import type { FormField, FormValues } from '@/components/admin/admin-record-form';
import { Add01Icon, ArrowLeft01Icon, Delete02Icon, PencilEdit02Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, TextInput } from 'react-native';

import { AdminRecordForm } from '@/components/admin/admin-record-form';
import { Card, LoadError, Loading } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, Pressable, SafeAreaView, ScrollView, Text, View } from '@/components/ui';

export type AdminRecord = { id: string };

export function apiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message)
      return response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
}

// eslint-disable-next-line max-lines-per-function
export function AdminCrudScreen<T extends AdminRecord>({
  title,
  items,
  loading,
  refreshing,
  error,
  fields,
  emptyValues,
  searchableText,
  itemTitle,
  itemSubtitle,
  itemMeta,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
  toForm,
  extraAction,
}: {
  title: string;
  items: T[];
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  fields: FormField[] | ((editing: T | null) => FormField[]);
  emptyValues: FormValues;
  searchableText: (item: T) => string;
  itemTitle: (item: T) => string;
  itemSubtitle: (item: T) => string;
  itemMeta?: (item: T) => string;
  onRefresh: () => void;
  onCreate: (values: FormValues) => Promise<unknown>;
  onUpdate: (item: T, values: FormValues) => Promise<unknown>;
  onDelete: (item: T) => Promise<unknown>;
  toForm: (item: T) => FormValues;
  extraAction?: (item: T, t: TFunction) => React.ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState<T | null | undefined>(undefined);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const visible = items.filter(item => searchableText(item).toLowerCase().includes(query.trim().toLowerCase()));

  const save = async (values: FormValues) => {
    setSaving(true);
    setFormError(null);
    try {
      if (editing)
        await onUpdate(editing, values);
      else
        await onCreate(values);
      setEditing(undefined);
      onRefresh();
    }
    catch (saveError) {
      setFormError(apiErrorMessage(saveError, t('admin.save_failed')));
    }
    finally {
      setSaving(false);
    }
  };

  const remove = (item: T) => Alert.alert(t('admin.delete'), t('admin.delete_confirmation', { name: itemTitle(item) }), [
    { text: t('admin.cancel'), style: 'cancel' },
    {
      text: t('admin.delete'),
      style: 'destructive',
      onPress: async () => {
        try {
          await onDelete(item);
          onRefresh();
        }
        catch (deleteError) {
          Alert.alert(t('admin.delete_failed'), apiErrorMessage(deleteError, t('admin.try_again')));
        }
      },
    },
  ]);

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <View className="gap-3 border-b border-border bg-surface px-4 py-3">
        <View className="flex-row items-center gap-3">
          <Pressable accessibilityRole="button" accessibilityLabel={t('admin.back')} onPress={() => router.back()} hitSlop={12}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={colors.neutral[500]} />
          </Pressable>
          <Text className="flex-1 text-xl font-extrabold text-foreground">{title}</Text>
          <Pressable accessibilityRole="button" onPress={() => setEditing(null)} className="flex-row items-center gap-1 rounded-xl bg-primary-500 px-3 py-2">
            <HugeiconsIcon icon={Add01Icon} size={16} color="#ffffff" />
            <Text className="text-xs font-extrabold text-white">{t('admin.add')}</Text>
          </Pressable>
        </View>
        <View className="flex-row items-center rounded-xl border border-border bg-card px-4 py-3">
          <HugeiconsIcon icon={Search01Icon} size={19} color={colors.neutral[400]} />
          <TextInput value={query} onChangeText={setQuery} placeholder={t('admin.search')} placeholderTextColor={colors.neutral[400]} className="ml-3 flex-1 text-base text-foreground" />
        </View>
      </View>

      {error
        ? <LoadError message={apiErrorMessage(error, t('admin.try_again'))} onRetry={onRefresh} />
        : loading
          ? <Loading />
          : (
              <ScrollView
                contentContainerClassName="gap-3 px-3 py-3 pb-8"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />}
              >
                {visible.length === 0 ? <Text className="py-12 text-center text-sm text-muted-foreground">{t('admin.no_records')}</Text> : null}
                {visible.map(item => (
                  <Card key={item.id} className="gap-3 border border-border p-4">
                    <View className="gap-1">
                      <Text selectable className="text-base font-extrabold text-foreground">{itemTitle(item)}</Text>
                      <Text selectable className="text-sm text-muted-foreground">{itemSubtitle(item)}</Text>
                      {itemMeta ? <Text selectable className="text-xs text-muted-foreground">{itemMeta(item)}</Text> : null}
                    </View>
                    <View className="flex-row items-center justify-end gap-2 border-t border-border pt-3">
                      {extraAction?.(item, t)}
                      <Pressable accessibilityRole="button" onPress={() => setEditing(item)} className="flex-row items-center gap-1 rounded-lg border border-border px-3 py-2">
                        <HugeiconsIcon icon={PencilEdit02Icon} size={15} color={colors.primary[600]} />
                        <Text className="text-xs font-bold text-primary-600">{t('admin.edit')}</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={() => remove(item)} className="flex-row items-center gap-1 rounded-lg border border-danger-200 px-3 py-2">
                        <HugeiconsIcon icon={Delete02Icon} size={15} color={colors.danger[500]} />
                        <Text className="text-xs font-bold text-danger-500">{t('admin.delete')}</Text>
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </ScrollView>
            )}

      {editing !== undefined
        ? (
            <AdminRecordForm
              title={editing ? t('admin.edit_title', { name: title }) : t('admin.add_title', { name: title })}
              fields={typeof fields === 'function' ? fields(editing) : fields}
              initialValues={editing ? toForm(editing) : emptyValues}
              saving={saving}
              error={formError}
              onClose={() => setEditing(undefined)}
              onSave={save}
            />
          )
        : null}
    </View>
  );
}
