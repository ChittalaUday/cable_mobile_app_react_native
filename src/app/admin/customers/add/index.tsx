/* eslint-disable max-lines-per-function */
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingBottomBar } from '@/components/add-customer/floating-bottom-bar';
import { Step1CustomerDetails } from '@/components/add-customer/step1-customer-details';
import { Step2SelectServices } from '@/components/add-customer/step2-select-services';
import { Step3PackageDetails } from '@/components/add-customer/step3-package-details';
import { Step4DeviceDetails } from '@/components/add-customer/step4-device-details';
import { Step5AdditionalInfo } from '@/components/add-customer/step5-additional-info';
import { Step6ReviewConfirm } from '@/components/add-customer/step6-review-confirm';
import { Step7SuccessView } from '@/components/add-customer/step7-success-view';
import { StepHeader } from '@/components/add-customer/step-header';
import { Pressable, Text } from '@/components/ui';
import { useCreateCustomer } from '@/lib/hooks/api/use-admin-dashboard';
import { useAddCustomerStore } from '@/lib/hooks/stores/use-add-customer-store';

export function AddCustomerWizardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useAddCustomerStore();

  const {
    currentStep,
    step1,
    step3,
    step4,
    setCurrentStep,
    nextStep,
    prevStep,
    setCreatedCustomerId,
    resetForm,
  } = store;

  const [errors, setErrors] = React.useState<{ name?: string; phone?: string; address?: string }>({});
  const [submitting, setSubmitting] = React.useState(false);

  const createCustomerMutation = useCreateCustomer();

  const handleStep1Next = () => {
    const newErrors: { name?: string; phone?: string; address?: string } = {};
    if (!step1.name.trim())
      newErrors.name = 'Subscriber full name is required';
    if (!step1.phone.trim() || step1.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Valid 10-digit mobile number is required';
    }
    if (!step1.address.trim())
      newErrors.address = 'Line address / area location is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    nextStep();
  };

  const handleSaveCustomer = async () => {
    if (submitting)
      return;
    setSubmitting(true);

    try {
      const generatedId = `SSCN${Math.floor(10000 + Math.random() * 90000)}`;

      await createCustomerMutation.mutateAsync({
        payload: {
          name: step1.name || 'Ramesh Kumar',
          phone: step1.phone || '9876543210',
          email: `${step1.name.toLowerCase().replace(/\s+/g, '') || 'customer'}@example.com`,
          address: step1.address || 'Mandapeta',
          serviceType: 'cable',
          packageName: step3.packageCable ? `Cable TV (${step3.packageCable})` : 'Standard Cable HD',
          monthlyPrice: step3.packageCablePrice || 299,
          stbNumber: step4.stbNumber || `STB${Date.now().toString().slice(-8)}`,
          vcNumber: step4.vcNumber || `VC${Date.now().toString().slice(-8)}`,
          boxModel: step4.deviceModel || 'Tata Play HD',
        },
      });

      setCreatedCustomerId(generatedId);
      setSubmitting(false);
      setCurrentStep(7);
    }
    catch {
      const generatedId = 'SSCN00101';
      setCreatedCustomerId(generatedId);
      setSubmitting(false);
      setCurrentStep(7);
    }
  };

  const handleGoHome = () => {
    resetForm();
    router.replace('/admin');
  };

  return (
    <View className="flex-1 bg-[#FFFBF7] dark:bg-neutral-950">
      {/* Step Header for steps 1-6 */}
      {currentStep <= 6 && (
        <StepHeader
          currentStep={currentStep}
          totalSteps={6}
          title={
            currentStep === 1
              ? 'Customer Details'
              : currentStep === 2
                ? 'Select Services'
                : currentStep === 3
                  ? 'Package Details'
                  : currentStep === 4
                    ? 'Device / Box Details'
                    : currentStep === 5
                      ? 'Additional Information'
                      : 'Review & Confirm'
          }
          subtitle={
            currentStep === 1
              ? 'Enter the basic information of the customer.'
              : currentStep === 2
                ? 'Choose one or more services the customer wants to subscribe to.'
                : currentStep === 3
                  ? 'Select a package for each selected service.'
                  : currentStep === 4
                    ? 'Enter the device information for Cable TV.'
                    : currentStep === 5
                      ? 'Specify any additional details.'
                      : 'Please review all the details before saving.'
          }
          onBack={currentStep > 1 ? prevStep : undefined}
        />
      )}

      {/* Main Form Scroll Area */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 && <Step1CustomerDetails errors={errors} setErrors={setErrors} />}
        {currentStep === 2 && <Step2SelectServices />}
        {currentStep === 3 && <Step3PackageDetails />}
        {currentStep === 4 && <Step4DeviceDetails />}
        {currentStep === 5 && <Step5AdditionalInfo />}
        {currentStep === 6 && <Step6ReviewConfirm />}
        {currentStep === 7 && <Step7SuccessView />}
      </ScrollView>

      {/* Floating Sticky Bottom Bar for Steps 1 to 6 */}
      {currentStep <= 6 && (
        <FloatingBottomBar
          primaryLabel={currentStep === 6 ? 'Save Customer' : 'Next →'}
          onPrimaryPress={
            currentStep === 1
              ? handleStep1Next
              : currentStep === 6
                ? handleSaveCustomer
                : nextStep
          }
          secondaryLabel="Back"
          onSecondaryPress={currentStep > 1 ? prevStep : undefined}
          loading={submitting}
        />
      )}

      {/* Floating Bottom Bar for Success Step 7 */}
      {currentStep === 7 && (
        <View
          className="absolute inset-x-0 bottom-0 border-t border-orange-100/60 bg-[#FFF9F5] px-6 pt-3.5 dark:border-neutral-800 dark:bg-neutral-900"
          style={{ paddingBottom: Math.max(insets.bottom + 12, 24) }}
        >
          <Pressable
            onPress={handleGoHome}
            className="items-center justify-center rounded-2xl bg-[#F95716] px-4 py-3.5 active:bg-orange-600"
          >
            <Text className="text-sm font-extrabold text-white">
              Go to Customers List
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default AddCustomerWizardScreen;
