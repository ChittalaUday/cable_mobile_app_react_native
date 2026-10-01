import type { IconSvgElement } from '@hugeicons/react-native';
import type { DialogPrompt } from './confirm-dialog';

export type DialogOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  icon?: IconSvgElement;
};

export type Dialogs = {
  /**
   * Says something and waits for "OK". Positional so it reads as a swap for
   * `Alert.alert(title, message)` at every call site it replaces.
   */
  notify: (title: string, message?: string) => Promise<void>;
  /** Resolves true only if the confirm button was the thing that closed it. */
  confirm: (options: DialogOptions) => Promise<boolean>;
  /** The typed text, or null if it was cancelled. Never an empty string. */
  prompt: (options: DialogOptions & { prompt?: DialogPrompt }) => Promise<string | null>;
};

let controller: Dialogs | null = null;

/** Called by `DialogProvider` as it mounts and unmounts. Nothing else sets this. */
export function setDialogController(next: Dialogs | null): void {
  controller = next;
}

function noProvider(action: string): void {
  if (__DEV__)
    console.warn(`dialogs.${action}() was called before <DialogProvider> mounted; nothing was shown.`);
}

/**
 * The app's dialogs, callable from anywhere — a component, a store, a mutation
 * handler — without threading a hook through.
 *
 * Module-level rather than context-only for the same reason `showMessage` is:
 * the thing that needs to say "that did not save" is usually an error callback,
 * not the render. A hook there means lifting state into a component that has no
 * other reason to know about it.
 *
 * Before the provider mounts every call is a no-op that resolves to the safe
 * answer — false for a confirm, null for a prompt — so a stray early call can
 * never read as consent.
 */
export const dialogs: Dialogs = {
  notify: async (title, message) => {
    if (controller === null)
      return noProvider('notify');

    return controller.notify(title, message);
  },
  confirm: async (options) => {
    if (controller === null) {
      noProvider('confirm');
      return false;
    }

    return controller.confirm(options);
  },
  prompt: async (options) => {
    if (controller === null) {
      noProvider('prompt');
      return null;
    }

    return controller.prompt(options);
  },
};
