import { create } from 'zustand';
import { createSelectors } from '@/lib/utils';

export type MoreSection
  = | 'overview'
    | 'services'
    | 'providers'
    | 'packages'
    | 'channels'
    | 'locations'
    | 'coverage';

type MoreState = {
  activeSection: MoreSection;
  searchQuery: string;
  selectedGenre: string | null;
  selectedLanguage: string | null;
  selectedPackageType: string | null;
  setActiveSection: (section: MoreSection) => void;
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genre: string | null) => void;
  setSelectedLanguage: (lang: string | null) => void;
  setSelectedPackageType: (type: string | null) => void;
  resetFilters: () => void;
};

const _useMoreStore = create<MoreState>(set => ({
  activeSection: 'overview',
  searchQuery: '',
  selectedGenre: null,
  selectedLanguage: null,
  selectedPackageType: null,

  setActiveSection: section => set({ activeSection: section, searchQuery: '' }),
  setSearchQuery: query => set({ searchQuery: query }),
  setSelectedGenre: genre => set({ selectedGenre: genre }),
  setSelectedLanguage: lang => set({ selectedLanguage: lang }),
  setSelectedPackageType: type => set({ selectedPackageType: type }),
  resetFilters: () =>
    set({
      searchQuery: '',
      selectedGenre: null,
      selectedLanguage: null,
      selectedPackageType: null,
    }),
}));

export const useMoreStore = createSelectors(_useMoreStore);
