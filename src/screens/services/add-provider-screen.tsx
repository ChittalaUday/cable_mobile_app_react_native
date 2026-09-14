import type { ProviderDraft } from './provider-details-form';
import type { Service, ServiceProvider } from '@/lib/api/types';
import type { Mark } from '@/screens/locations/coverage-marks';
import {
  Add01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Location01Icon,
  PackageIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, ScrollView } from 'react-native';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { SaveBar } from '@/components/common/save-bar';
import { Card } from '@/components/common/shell';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  Text,
  useModal,
  View,
} from '@/components/ui';
import { useUpdateServiceProviderCoverage } from '@/lib/hooks/api/use-locations';
import { useCreateServiceProvider, useUpdateServiceProvider } from '@/lib/hooks/api/use-service-providers';
import { useDeleteService, useServices } from '@/lib/hooks/api/use-services';
import { CoveragePicker, entriesFromMarks } from '@/screens/locations/coverage-picker';
import { ProviderDetailsForm } from './provider-details-form';
import { ServiceFormSheet } from './service-form-sheet';
import { usePackageFormStore } from './use-package-form-store';

type Step = 'details' | 'coverage' | 'package';

const STEPS: { key: Step; label: string; icon: typeof UserIcon }[] = [
  { key: 'details', label: 'Details', icon: UserIcon },
  { key: 'coverage', label: 'Coverage', icon: Location01Icon },
  { key: 'package', label: 'Packages', icon: PackageIcon },
];

const EMPTY_DRAFT: ProviderDraft = {
  name: '',
  serviceId: null,
  code: '',
  phone: '',
  website: '',
  description: '',
  isDefault: false,
};

/**
 * One dot per step: done, current, or still ahead.
 *
 * Each step is its own request, so a tick means the write actually landed —
 * not merely that the operator walked past it.
 */
function StepRail({
  step,
  done,
  onJump,
}: {
  step: Step;
  done: Set<Step>;
  onJump: (next: Step) => void;
}) {
  return (
    <View className="flex-row items-center gap-1 px-3 pb-2.5">
      {STEPS.map((entry, index) => {
        const isDone = done.has(entry.key);
        const isCurrent = entry.key === step;

        return (
          <React.Fragment key={entry.key}>
            {index > 0
              ? <View className={`h-px flex-1 ${isDone || isCurrent ? 'bg-primary-400' : 'bg-border'}`} />
              : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isCurrent }}
              accessibilityLabel={`${entry.label}${isDone ? ', done' : ''}`}
              onPress={() => onJump(entry.key)}
              className="flex-row items-center gap-1.5"
            >
              <View
                className={`size-8 items-center justify-center rounded-full border ${
                  isCurrent
                    ? 'border-primary-600 bg-primary-600'
                    : isDone
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-border bg-card'
                }`}
              >
                <HugeiconsIcon
                  icon={isDone && !isCurrent ? CheckmarkCircle02Icon : entry.icon}
                  size={16}
                  color={isCurrent || isDone ? '#ffffff' : colors.neutral[500]}
                  strokeWidth={2.2}
                />
              </View>
              {isCurrent
                ? <Text className="text-xs font-bold text-primary-600">{entry.label}</Text>
                : null}
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

/**
 * Adding a provider, in three independent writes.
 *
 * Each step commits on its own — the provider is created at the end of step
 * one, its coverage is a second call, and a package is a third — so anything
 * already saved survives backing out of what comes next. That is also why every
 * step past the first can be skipped: a provider with no coverage sells
 * wherever its service does, and one with no packages is simply not selling yet.
 */
// eslint-disable-next-line max-lines-per-function
export function AddProviderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const serviceSheet = useModal();

  const [step, setStep] = React.useState<Step>('details');
  const [draft, setDraft] = React.useState<ProviderDraft>(EMPTY_DRAFT);
  const [marks, setMarks] = React.useState<Map<string, Mark>>(new Map());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [provider, setProvider] = React.useState<ServiceProvider | null>(null);
  const [confirming, setConfirming] = React.useState<Step | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Service | null>(null);
  const [done, setDone] = React.useState<Set<Step>>(new Set());

  const { data: services = [] } = useServices();
  const createProvider = useCreateServiceProvider();
  const updateProvider = useUpdateServiceProvider();
  const updateCoverage = useUpdateServiceProviderCoverage();
  const deleteService = useDeleteService();
  const initNewPackage = usePackageFormStore(s => s.initNewPackage);

  const setField = React.useCallback(
    <K extends keyof ProviderDraft>(key: K, value: ProviderDraft[K]) => {
      setDraft(prev => ({ ...prev, [key]: value }));
      setErrors({});
    },
    [],
  );

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!draft.name.trim())
      errs.name = 'Provider name is required';
    if (!draft.serviceId)
      errs.service = 'Choose the service this provider delivers';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const markDone = (key: Step) => setDone(prev => new Set(prev).add(key));

  // ── Step 1: create, or save edits to what was already created ─────────────
  const saveDetails = async () => {
    const contact = {
      ...(draft.phone.trim() ? { phone: draft.phone.trim() } : {}),
      ...(draft.website.trim() ? { website: draft.website.trim() } : {}),
    };

    try {
      const saved = provider
        ? await updateProvider.mutateAsync({
            id: provider.id,
            patch: {
              name: draft.name.trim(),
              code: draft.code.trim() || null,
              description: draft.description.trim() || null,
              contact: Object.keys(contact).length > 0 ? contact : null,
              isDefault: draft.isDefault,
            },
          })
        : await createProvider.mutateAsync({
            payload: {
              serviceId: draft.serviceId!,
              name: draft.name.trim(),
              code: draft.code.trim() || undefined,
              description: draft.description.trim() || undefined,
              contact: Object.keys(contact).length > 0 ? contact : undefined,
              isDefault: draft.isDefault,
            },
          });

      await queryClient.invalidateQueries({ queryKey: ['service-providers'] });
      await queryClient.invalidateQueries({ queryKey: ['services'] });

      setProvider(saved);
      markDone('details');
      setConfirming(null);
      setStep('coverage');
    }
    catch (err) {
      setConfirming(null);
      Alert.alert('Could not save provider', (err as Error).message || 'Please try again.');
    }
  };

  // ── Step 2: coverage, its own call against the provider that now exists ───
  const saveCoverage = async () => {
    if (!provider)
      return;

    try {
      await updateCoverage.mutateAsync({ id: provider.id, entries: entriesFromMarks(marks) });
      await queryClient.invalidateQueries({ queryKey: ['service-providers', 'coverage'] });

      markDone('coverage');
      setConfirming(null);
      setStep('package');
    }
    catch (err) {
      setConfirming(null);
      Alert.alert('Could not save coverage', (err as Error).message || 'Please try again.');
    }
  };

  const deleteServiceNow = async () => {
    if (!pendingDelete)
      return;

    try {
      await deleteService.mutateAsync({ id: pendingDelete.id });
      if (draft.serviceId === pendingDelete.id)
        setField('serviceId', null);
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
    }
    catch (err) {
      setPendingDelete(null);
      Alert.alert('Could not delete service', (err as Error).message);
    }
  };

  const addPackage = () => {
    if (!provider)
      return;

    initNewPackage({ id: provider.id, name: provider.name });
    router.push('/add-edit-package');
  };

  const finish = () => router.replace(
    provider ? `/provider-details/${provider.id}` : '/services',
  );

  /** Only reachable once the provider exists; the rest is free to revisit. */
  const jumpTo = (next: Step) => {
    if (next === 'details' || provider)
      setStep(next);
  };

  const isSaving = createProvider.isPending || updateProvider.isPending || updateCoverage.isPending;
  const confirmCopy = COPY[confirming ?? 'details'](draft, provider, marks.size);

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />

      <ServiceFormSheet
        ref={serviceSheet.ref}
        onCreated={(created) => {
          serviceSheet.dismiss();
          setField('serviceId', created.id);
        }}
      />

      <ConfirmDialog
        visible={confirming !== null}
        busy={isSaving}
        tone="default"
        title={confirmCopy.title}
        confirmLabel={confirmCopy.confirmLabel}
        message={confirmCopy.message}
        onConfirm={confirming === 'coverage' ? saveCoverage : saveDetails}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        busy={deleteService.isPending}
        title="Delete service"
        message={`Delete ${pendingDelete?.name ?? ''}? Nothing supplies it, so nothing on sale is affected.`}
        onConfirm={deleteServiceNow}
        onCancel={() => setPendingDelete(null)}
      />

      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center justify-between gap-3 px-3 pt-1 pb-3">
          <View className="flex-1 flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              className="size-9 items-center justify-center rounded-lg border border-border bg-card"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">
                {provider?.name ?? 'Add Provider'}
              </Text>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {provider ? 'Saved — the rest is optional' : 'Register a service provider'}
              </Text>
            </View>
          </View>

          {step === 'details'
            ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add a service"
                  onPress={serviceSheet.present}
                  className="size-9 items-center justify-center rounded-full bg-primary-600 active:bg-primary-700"
                >
                  <HugeiconsIcon icon={Add01Icon} size={20} color="#ffffff" strokeWidth={2.4} />
                </Pressable>
              )
            : null}
        </View>

        <StepRail step={step} done={done} onJump={jumpTo} />
      </SafeAreaView>

      {step === 'details'
        ? (
            <ProviderDetailsForm
              draft={draft}
              onChange={setField}
              errors={errors}
              services={services}
              onAddService={serviceSheet.present}
              onDeleteService={setPendingDelete}
            />
          )
        : step === 'coverage'
          ? (
              <CoveragePicker
                marks={marks}
                onChange={setMarks}
                blurb={`Where ${provider?.name ?? 'this provider'} reaches, within the places the service is sold.`}
                bounds={{ serviceId: draft.serviceId ?? undefined }}
              />
            )
          : (
              <ScrollView className="flex-1 px-4" contentContainerClassName="pt-3 pb-6 gap-3">
                <Card className="items-center gap-2 border border-border p-6">
                  <View className="size-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/60">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} color={colors.success[600]} strokeWidth={2} />
                  </View>
                  <Text className="text-base font-bold text-foreground">
                    {`${provider?.name ?? 'Provider'} is set up`}
                  </Text>
                  <Text className="text-center text-xs text-muted-foreground">
                    It has nothing to sell yet. Add a package now, or come back to it later —
                    the provider is already saved either way.
                  </Text>
                </Card>
              </ScrollView>
            )}

      <SaveBar
        label={STEP_ACTION[step].label(provider !== null)}
        busyLabel="Saving…"
        busy={isSaving}
        onPress={() => {
          if (step === 'details') {
            if (validate())
              setConfirming('details');
          }
          else if (step === 'coverage') {
            setConfirming('coverage');
          }
          else {
            addPackage();
          }
        }}
        secondary={step === 'details'
          ? undefined
          : {
              // Past step one everything is already saved, so leaving is a
              // skip rather than an abandon.
              label: step === 'coverage' ? 'Skip' : 'Finish',
              onPress: step === 'coverage' ? () => setStep('package') : finish,
            }}
      />
    </View>
  );
}

const STEP_ACTION: Record<Step, { label: (created: boolean) => string }> = {
  details: { label: created => (created ? 'Save Changes' : 'Create Provider') },
  coverage: { label: () => 'Save Coverage' },
  package: { label: () => 'Add Package' },
};

const COPY: Record<Step, (
  draft: ProviderDraft,
  provider: ServiceProvider | null,
  markCount: number,
) => { title: string; confirmLabel: string; message: string }> = {
  details: (draft, provider) => (provider
    ? {
        title: 'Save changes',
        confirmLabel: 'Save changes',
        message: `Update ${provider.name}?`,
      }
    : {
        title: 'Create provider',
        confirmLabel: 'Create provider',
        message: `Create ${draft.name.trim() || 'this provider'}? It is saved straight away — coverage and packages come after, and both can be skipped.`,
      }),
  coverage: (_draft, provider, markCount) => ({
    title: 'Save coverage',
    confirmLabel: 'Save coverage',
    message: markCount === 0
      ? `Save no coverage rules for ${provider?.name ?? 'this provider'}? It will then sell wherever its service does.`
      : `Apply ${markCount} coverage ${markCount === 1 ? 'rule' : 'rules'} to ${provider?.name ?? 'this provider'}?`,
  }),
  package: (_draft, provider) => ({
    title: 'Add package',
    confirmLabel: 'Add package',
    message: `Add a package to ${provider?.name ?? 'this provider'}?`,
  }),
};
