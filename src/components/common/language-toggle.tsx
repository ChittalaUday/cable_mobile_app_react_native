import type { Language } from '@/lib/i18n/resources';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Tick02Icon, TranslateIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Pressable } from 'react-native';

import { useUniwind } from 'uniwind';
import { colors, renderBackdrop, Text, View } from '@/components/ui';
import { translate, useSelectedLanguage } from '@/lib/i18n';

const LANGUAGE_BADGES: Record<Language, string> = {
  en: 'EN',
  te: 'తె',
};

type LanguageToggleProps = {
  iconSize?: number;
  className?: string;
};

export function LanguageToggle({ iconSize = 20, className = 'p-1' }: LanguageToggleProps) {
  const { language, setLanguage } = useSelectedLanguage();
  const currentLanguage = language ?? 'en';
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const sheetRef = React.useRef<BottomSheetModal>(null);

  const langs = React.useMemo(
    () => [
      { label: 'English', value: 'en' as Language },
      { label: 'తెలుగు', value: 'te' as Language },
    ],
    [],
  );

  return (
    <>
      <Pressable
        testID="language-toggle"
        onPress={() => sheetRef.current?.present()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={translate('login.select_language')}
        className={className}
      >
        <HugeiconsIcon icon={TranslateIcon} size={iconSize} color={colors.primary[600]} strokeWidth={1.8} />
      </Pressable>
      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={[langs.length * 80 + 130]}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? colors.neutral[800] : colors.white }}
        handleIndicatorStyle={{ backgroundColor: isDark ? colors.neutral[600] : colors.neutral[300] }}
      >
        <BottomSheetView className="gap-3 px-6 pt-2 pb-6">
          <Text className="mb-1 text-center text-base font-bold text-foreground">{translate('settings.language')}</Text>
          {langs.map(lang => (
            <Pressable
              key={lang.value}
              testID={`language-toggle-item-${lang.value}`}
              onPress={() => {
                setLanguage(lang.value);
                sheetRef.current?.dismiss();
              }}
              className={`flex-row items-center gap-3.5 rounded-2xl p-4 ${lang.value === currentLanguage ? 'bg-primary-50 dark:bg-primary-900/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}
            >
              <View className={`size-10 items-center justify-center rounded-xl ${lang.value === currentLanguage ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                <Text className={`text-xs font-bold ${lang.value === currentLanguage ? 'text-white' : 'text-neutral-500 dark:text-neutral-300'}`}>
                  {LANGUAGE_BADGES[lang.value]}
                </Text>
              </View>
              <Text className={`flex-1 text-base font-semibold ${lang.value === currentLanguage ? 'text-primary-600' : 'text-foreground'}`}>
                {lang.label}
              </Text>
              {lang.value === currentLanguage && (
                <HugeiconsIcon icon={Tick02Icon} size={20} color={colors.primary[600]} strokeWidth={2.2} />
              )}
            </Pressable>
          ))}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
