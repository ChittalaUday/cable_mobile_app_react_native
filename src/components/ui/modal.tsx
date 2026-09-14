/* eslint-disable react-refresh/only-export-components */
/**
 * Modal
 * Dependencies:
 * - @gorhom/bottom-sheet.
 *
 * Props:
 * - All `BottomSheetModalProps` props.
 * - `title` (string | undefined): Optional title for the modal header.
 *
 * Usage Example:
 * import { Modal, useModal } from '@gorhom/bottom-sheet';
 *
 * function DisplayModal() {
 *   const { ref, present, dismiss } = useModal();
 *
 *   return (
 *     <View>
 *       <Modal
 *         snapPoints={['60%']} // optional
 *         title="Modal Title"
 *         ref={ref}
 *       >
 *         Modal Content
 *       </Modal>
 *     </View>
 *   );
 * }
 *
 */

import type {
  BottomSheetBackdropProps,
  BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { BottomSheetModal, useBottomSheet } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';

import { Text } from './text';

type ModalProps = BottomSheetModalProps & {
  title?: string;
};

type ModalRef = React.ForwardedRef<BottomSheetModal>;

/**
 * Safe-area insets, read without insisting on a provider.
 *
 * `useSafeAreaInsets` throws when nothing above it provides them, and a test
 * that stubs the library out may not export the context at all — neither is a
 * reason for a sheet to fail to render. Resolved once at import, so the hook
 * call below stays stable.
 */
const InsetsContext: React.Context<{ top: number } | null>
  = (SafeAreaInsetsContext as React.Context<{ top: number } | null> | undefined)
    ?? React.createContext<{ top: number } | null>(null);

type ModalHeaderProps = {
  title?: string;
  dismiss: () => void;
};

export function useModal() {
  const ref = React.useRef<BottomSheetModal>(null);
  const present = React.useCallback((data?: unknown) => {
    ref.current?.present(data);
  }, []);
  const dismiss = React.useCallback(() => {
    ref.current?.dismiss();
  }, []);
  return { ref, present, dismiss };
}

export function Modal({ ref, snapPoints: _snapPoints = ['60%', '100%'] as (string | number)[], title, detached = false, topInset, ...props }: ModalProps & { ref?: ModalRef }) {
  const detachedProps = React.useMemo(
    () => getDetachedProps(detached),
    [detached],
  );
  const modal = useModal();
  const insets = React.use(InsetsContext);
  const snapPoints = React.useMemo(() => _snapPoints, [_snapPoints]);

  /*
   * A sheet can be dragged up to fill the screen, so it stops short of the
   * status bar rather than sliding under the clock. Callers that set their own
   * `topInset` keep it.
   */
  const safeTopInset = topInset ?? insets?.top ?? 0;

  React.useImperativeHandle(
    ref,
    () => (modal.ref.current as BottomSheetModal) || null,
  );

  const renderHandleComponent = React.useCallback(
    () => (
      <>
        {/*
          The grab bar sits just above the header. It used to carry `mb-8`,
          which opened 32dp of dead space between the bar and the title on
          every sheet in the app.
        */}
        <View className="mt-2.5 mb-1 h-1 w-12 self-center rounded-lg bg-gray-400 dark:bg-gray-700" />
        <ModalHeader title={title} dismiss={modal.dismiss} />
      </>
    ),
    [title, modal.dismiss],
  );

  return (
    <BottomSheetModal
      {...props}
      {...detachedProps}
      ref={modal.ref}
      index={0}
      snapPoints={snapPoints}
      topInset={detached ? topInset : safeTopInset}
      enablePanDownToClose
      backdropComponent={props.backdropComponent || renderBackdrop}
      enableDynamicSizing={false}
      handleComponent={renderHandleComponent}
    />
  );
}

/**
 * Custom Backdrop
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CustomBackdrop({ style }: BottomSheetBackdropProps) {
  const { close } = useBottomSheet();
  return (
    <AnimatedPressable
      onPress={() => close()}
      entering={FadeIn.duration(50)}
      exiting={FadeOut.duration(20)}
      style={[style, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
    />
  );
}

export function renderBackdrop(props: BottomSheetBackdropProps) {
  return <CustomBackdrop {...props} />;
}

/**
 *
 * @param detached
 * @returns
 *
 * @description
 * In case the modal is detached, we need to add some extra props to the modal to make it look like a detached modal.
 */

function getDetachedProps(detached: boolean) {
  if (detached) {
    return {
      detached: true,
      bottomInset: 46,
      style: { marginHorizontal: 16, overflow: 'hidden' },
    } as Partial<BottomSheetModalProps>;
  }
  return {} as Partial<BottomSheetModalProps>;
}

/**
 * ModalHeader
 */

const ModalHeader = React.memo(({ title, dismiss }: ModalHeaderProps) => {
  /*
   * A balanced three-column row: equal gutters left and right, so a centred
   * title is actually centred. The close button used to be absolutely
   * positioned over the grab bar, which left it floating above the title and
   * — on a sheet with no title — sitting on top of the content.
   */
  return (
    <View className="flex-row items-center border-b border-border p-3">
      <View className="size-8" />
      <View className="flex-1">
        {title
          ? (
              <Text className="text-center text-[16px] font-bold text-[#26313D] dark:text-white">
                {title}
              </Text>
            )
          : null}
      </View>
      <CloseButton close={dismiss} />
    </View>
  );
});

function CloseButton({ close }: { close: () => void }) {
  return (
    <Pressable
      onPress={close}
      className="size-8 items-center justify-center rounded-full active:bg-muted"
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      accessibilityLabel="close modal"
      accessibilityRole="button"
      accessibilityHint="closes the modal"
    >
      <Svg
        className="fill-neutral-300 dark:fill-white"
        width={24}
        height={24}
        fill="none"
        viewBox="0 0 24 24"
      >
        <Path d="M18.707 6.707a1 1 0 0 0-1.414-1.414L12 10.586 6.707 5.293a1 1 0 0 0-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 1 0 1.414 1.414L12 13.414l5.293 5.293a1 1 0 0 0 1.414-1.414L13.414 12l5.293-5.293Z" />
      </Svg>
    </Pressable>
  );
}
