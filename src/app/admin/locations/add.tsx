import type { Location, LocationSchema } from '@/lib/api/types';
import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, ScrollView, Switch, TextInput } from 'react-native';

import { SaveBar } from '@/components/common/save-bar';
import { Card } from '@/components/common/shell';
import { LocationPickerSheet } from '@/components/locations/location-picker-sheet';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  Text,
  useModal,
  View,
} from '@/components/ui';
import { MAX_PAGE_SIZE } from '@/lib/api/types';
import {
  useCreateLocation,
  useLocations,
  useLocationSchemas,
  useUpdateLocation,
} from '@/lib/hooks/api/use-locations';

/**
 * What the new node will be called in the hierarchy.
 *
 * The category is not a free choice: a schema fixes the order of its levels, so
 * a child of a Town is whatever the schema says sits below Town. This resolves
 * the same rule the API enforces, so the form can show it before saving rather
 * than surfacing a 400 afterwards.
 */
function levelUnder(schema: LocationSchema | undefined, parent: Location | undefined) {
  if (!schema)
    return undefined;
  if (!parent)
    return schema.levels[0];

  const parentDepth = schema.levels.findIndex(level => level.categoryId === parent.categoryId);
  return parentDepth === -1 ? undefined : schema.levels[parentDepth + 1];
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text className="text-sm font-bold text-foreground">
      {children}
      {required ? <Text className="text-primary-600"> *</Text> : null}
    </Text>
  );
}

function Dropdown({
  label,
  value,
  placeholder,
  children,
}: {
  label: string;
  value: string;
  placeholder: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <View className="gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(!open)}
        className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5"
      >
        <Text
          className={`flex-1 text-sm font-medium ${value ? 'text-foreground' : 'text-muted-foreground'}`}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[400]} />
      </Pressable>
      {open
        ? (
            <Card className="max-h-72 border border-border p-1">
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {children(() => setOpen(false))}
              </ScrollView>
            </Card>
          )
        : null}
    </View>
  );
}

function Option({ title, subtitle, selected, onPress }: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-xl px-4 py-2.5 ${selected ? 'dark:bg-primary-950/60 bg-primary-50' : ''}`}
    >
      <Text className={`text-sm font-semibold ${selected ? 'text-primary-600' : 'text-foreground'}`}>
        {title}
      </Text>
      {subtitle ? <Text className="text-xs text-muted-foreground" numberOfLines={1}>{subtitle}</Text> : null}
    </Pressable>
  );
}

// eslint-disable-next-line max-lines-per-function
export function AddLocationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // `?id=` edits a node; `?parentId=` starts a child under one. Both arrive
  // from the tree's action sheet.
  const params = useLocalSearchParams<{ id?: string; parentId?: string }>();
  const editingId = params.id ?? null;

  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);
  const [schemaId, setSchemaId] = React.useState<string | null>(null);
  const [parentId, setParentId] = React.useState<string | null>(params.parentId ?? null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const picker = useModal();

  const { data: schemas = [] } = useLocationSchemas();
  // Only needed to resolve the node being edited; the picker fetches its own
  // levels rather than holding the whole tree in memory.
  const { data: locationsPage } = useLocations({
    variables: { limit: MAX_PAGE_SIZE },
    enabled: Boolean(editingId),
  });
  const locations = React.useMemo(() => locationsPage?.items ?? [], [locationsPage]);

  const [parent, setParent] = React.useState<Location | null>(null);

  const editing = editingId === null ? undefined : locations.find(loc => loc.id === editingId);
  const hydrated = React.useRef(false);

  // Fill the form once the node being edited turns up in the list.
  React.useEffect(() => {
    if (!editing || hydrated.current)
      return;

    hydrated.current = true;
    setName(editing.name);
    setCode(editing.code ?? '');
    setAddress(String((editing.metadata as { address?: string } | null)?.address ?? ''));
    setIsActive(editing.isActive);
    setParentId(editing.parentId);
  }, [editing]);

  const choosePlacement = React.useCallback((next: Location | null) => {
    setParent(next);
    setParentId(next?.id ?? null);
    picker.dismiss();
  }, [picker]);

  /** What the new node would be called under a given parent, for the picker. */
  const describeLevel = React.useCallback(
    (candidate: Location | null) => levelUnder(
      schemas.find(item => item.id === (candidate?.schemaId ?? schemaId)),
      candidate ?? undefined,
    )?.categoryName,
    [schemas, schemaId],
  );

  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();

  // A parent settles the hierarchy; only a root node gets to pick one.
  const effectiveSchemaId = parent?.schemaId ?? schemaId;
  const schema = schemas.find(s => s.id === effectiveSchemaId);
  const level = levelUnder(schema, parent ?? undefined);

  const activeSchemas = React.useMemo(() => schemas.filter(s => s.isActive), [schemas]);

  React.useEffect(() => {
    if (schemaId === null && activeSchemas.length === 1)
      setSchemaId(activeSchemas[0]!.id);
  }, [schemaId, activeSchemas]);

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim())
      errs.name = 'Name is required';

    // Placement only has to resolve for a node that is being created.
    if (!editingId) {
      if (!effectiveSchemaId)
        errs.schema = 'Choose a hierarchy, or a parent location inside one';
      else if (!level)
        errs.parent = 'This hierarchy defines no level below that parent';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0)
      return;

    try {
      if (editingId) {
        // The parent and the hierarchy are not patchable — moving a node is a
        // re-parent, not an edit, and the API has no route for it.
        await updateLocation.mutateAsync({
          id: editingId,
          patch: {
            name: name.trim(),
            code: code.trim() || null,
            isActive,
            metadata: address.trim() ? { address: address.trim() } : null,
          },
        });
      }
      else {
        const created = await createLocation.mutateAsync({
          payload: {
            name: name.trim(),
            schemaId: effectiveSchemaId ?? undefined,
            parentId: parentId ?? undefined,
            code: code.trim() || undefined,
            metadata: address.trim() ? { address: address.trim() } : undefined,
          },
        });

        // `POST /locations` always creates an active node; only a patch can
        // stand one up disabled.
        if (!isActive)
          await updateLocation.mutateAsync({ id: created.id, patch: { isActive: false } });
      }

      await queryClient.invalidateQueries({ queryKey: ['locations'] });
      router.back();
    }
    catch (err) {
      Alert.alert('Could not save location', (err as Error).message || 'Please try again.');
    }
  };

  const isSaving = createLocation.isPending || updateLocation.isPending;

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />

      <LocationPickerSheet
        ref={picker.ref}
        onSelect={choosePlacement}
        describeLevel={describeLevel}
      />

      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center gap-3 px-3 pt-1 pb-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="size-9 items-center justify-center rounded-lg border border-border bg-card"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-foreground">
              {editingId ? 'Edit Location' : 'Add Location'}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {editingId ? 'Rename or reconfigure this node' : 'Create a new location'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="pt-2 pb-6 gap-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1.5">
          <FieldLabel required>Name</FieldLabel>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Mandapeta"
            placeholderTextColor={colors.neutral[400]}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
          {errors.name ? <Text className="text-xs text-danger-500">{errors.name}</Text> : null}
        </View>

        {editingId
          ? (
              <View className="rounded-2xl border border-border bg-card px-4 py-3">
                <Text className="text-xs text-muted-foreground">Placement</Text>
                <Text className="mt-0.5 text-sm font-semibold text-foreground" numberOfLines={2}>
                  {editing?.path ?? '—'}
                </Text>
                <Text className="mt-1 text-[11px] text-muted-foreground">
                  Where a node sits is fixed — moving one is a re-parent, not an edit.
                </Text>
              </View>
            )
          : (
              <View className="gap-1.5">
                <FieldLabel>Parent Location</FieldLabel>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose parent location"
                  onPress={picker.present}
                  className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5"
                >
                  <View className="flex-1 pr-2">
                    <Text
                      className={`text-sm font-medium ${parent ? 'text-foreground' : 'text-muted-foreground'}`}
                      numberOfLines={1}
                    >
                      {parent?.name ?? 'Top level'}
                    </Text>
                    {parent
                      ? (
                          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                            {parent.path}
                          </Text>
                        )
                      : null}
                  </View>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={17} color={colors.neutral[400]} strokeWidth={2} />
                </Pressable>
                {errors.parent ? <Text className="text-xs text-danger-500">{errors.parent}</Text> : null}
              </View>
            )}

        {!editingId && parentId === null
          ? (
              <View className="gap-1.5">
                <Dropdown
                  label="Hierarchy"
                  value={schema?.name ?? ''}
                  placeholder="Choose a hierarchy"
                >
                  {close => activeSchemas.map(item => (
                    <Option
                      key={item.id}
                      title={item.name}
                      subtitle={item.levels.map(l => l.categoryName).join(' › ')}
                      selected={item.id === schemaId}
                      onPress={() => {
                        setSchemaId(item.id);
                        close();
                      }}
                    />
                  ))}
                </Dropdown>
                {errors.schema ? <Text className="text-xs text-danger-500">{errors.schema}</Text> : null}
              </View>
            )
          : null}

        {/* The hierarchy decides the type, so it is shown, not asked for. */}
        {editingId
          ? null
          : (
              <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
                <Text className="text-sm font-bold text-foreground">Location Type</Text>
                <View className="dark:bg-primary-950/60 rounded-lg bg-primary-50 px-2.5 py-1">
                  <Text className="text-xs font-bold text-primary-600">
                    {level?.categoryName ?? 'Pick a hierarchy first'}
                  </Text>
                </View>
              </View>
            )}

        <View className="gap-1.5">
          <FieldLabel>Code (Optional)</FieldLabel>
          <TextInput
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            placeholder="e.g. MDP"
            placeholderTextColor={colors.neutral[400]}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </View>

        <View className="gap-1.5">
          <FieldLabel>Address / Description</FieldLabel>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address or description..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={colors.neutral[400]}
            className="min-h-21 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </View>

        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <Text className="text-sm font-bold text-foreground">Is Active</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
            thumbColor="#ffffff"
          />
        </View>
      </ScrollView>

      <SaveBar
        label={editingId ? 'Save Changes' : 'Save Location'}
        busyLabel="Saving Location…"
        busy={isSaving}
        onPress={handleSave}
      />
    </View>
  );
}

export default AddLocationScreen;
