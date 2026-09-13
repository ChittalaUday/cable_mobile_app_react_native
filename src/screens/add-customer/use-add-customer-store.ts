import { create } from 'zustand';

export type CustomerType = 'individual' | 'business';
export type ServiceOption = 'cable' | 'broadband' | 'iptv' | 'combo';
export type BoxCategory = 'stb' | 'ont' | 'iptv_device';

export type Step1Data = {
  name: string;
  phone: string;
  alternatePhone: string;
  address: string;
  area: string;
  customerType: CustomerType;
};

export type Step2Data = {
  selectedServices: ServiceOption[];
};

export type Step3Data = {
  activeTab: 'cable' | 'broadband' | 'iptv';
  packageCable: string;
  packageCablePrice: number;
  packageBroadband: string;
  packageBroadbandPrice: number;
  packageIptv: string;
  packageIptvPrice: number;
};

export type Step4Data = {
  activeDeviceTab: BoxCategory;
  stbNumber: string;
  vcNumber: string;
  deviceModel: string;
  installationDate: string;
};

export type Step5Data = {
  categoryLocality: string;
  connectionDate: string;
  status: 'active' | 'inactive';
  dueDate: string;
  notes: string;
};

type AddCustomerState = {
  currentStep: number;
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
  step5: Step5Data;
  createdCustomerId: string;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep1: (data: Partial<Step1Data>) => void;
  setStep2: (data: Partial<Step2Data>) => void;
  setStep3: (data: Partial<Step3Data>) => void;
  setStep4: (data: Partial<Step4Data>) => void;
  setStep5: (data: Partial<Step5Data>) => void;
  setCreatedCustomerId: (id: string) => void;
  resetForm: () => void;
};

const initialStep1: Step1Data = {
  name: '',
  phone: '',
  alternatePhone: '',
  address: '',
  area: 'Mandapeta',
  customerType: 'individual',
};

const initialStep2: Step2Data = {
  selectedServices: ['cable'],
};

const initialStep3: Step3Data = {
  activeTab: 'cable',
  packageCable: 'Standard',
  packageCablePrice: 299,
  packageBroadband: 'Standard Fiber',
  packageBroadbandPrice: 499,
  packageIptv: 'Basic OTT',
  packageIptvPrice: 199,
};

const initialStep4: Step4Data = {
  activeDeviceTab: 'stb',
  stbNumber: '',
  vcNumber: '',
  deviceModel: 'Tata Play HD',
  installationDate: new Date().toISOString().split('T')[0],
};

const initialStep5: Step5Data = {
  categoryLocality: 'Mandapeta',
  connectionDate: new Date().toISOString().split('T')[0],
  status: 'active',
  dueDate: '1',
  notes: '',
};

export const useAddCustomerStore = create<AddCustomerState>(set => ({
  currentStep: 1,
  step1: initialStep1,
  step2: initialStep2,
  step3: initialStep3,
  step4: initialStep4,
  step5: initialStep5,
  createdCustomerId: 'SSCN00101',

  setCurrentStep: step => set({ currentStep: step }),
  nextStep: () => set(state => ({ currentStep: Math.min(state.currentStep + 1, 7) })),
  prevStep: () => set(state => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

  setStep1: data => set(state => ({ step1: { ...state.step1, ...data } })),
  setStep2: data => set(state => ({ step2: { ...state.step2, ...data } })),
  setStep3: data => set(state => ({ step3: { ...state.step3, ...data } })),
  setStep4: data => set(state => ({ step4: { ...state.step4, ...data } })),
  setStep5: data => set(state => ({ step5: { ...state.step5, ...data } })),
  setCreatedCustomerId: id => set({ createdCustomerId: id }),

  resetForm: () =>
    set({
      currentStep: 1,
      step1: initialStep1,
      step2: initialStep2,
      step3: initialStep3,
      step4: initialStep4,
      step5: initialStep5,
      createdCustomerId: 'SSCN00101',
    }),
}));
