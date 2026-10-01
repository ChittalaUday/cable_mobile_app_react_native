/* eslint-disable react-refresh/only-export-components -- the hook belongs beside the provider it reads. */
import type { DialogPrompt } from './confirm-dialog';
import type { DialogOptions, Dialogs } from './dialogs';
import * as React from 'react';
import { ConfirmDialog } from './confirm-dialog';
import { setDialogController } from './dialogs';

type Request = DialogOptions & {
  id: number;
  kind: 'notice' | 'confirm' | 'prompt';
  prompt?: DialogPrompt;
  settle: (value: string | null) => void;
};

const DialogContext = React.createContext<Dialogs | null>(null);

/**
 * The app's dialogs, asked for in code rather than rendered into every screen.
 *
 * `Alert.alert` is a system component: it ignores the theme, it cannot be
 * driven in a test, and on Android it looks like a different application. The
 * declarative `ConfirmDialog` fixes the look but costs a piece of state and a
 * block of JSX at every call site, which is why 25 files reached for the system
 * alert instead. One provider at the root, and the call is a single line that
 * returns what the person chose.
 */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = React.useState<Request | null>(null);
  const nextId = React.useRef(0);

  const open = React.useCallback((
    kind: Request['kind'],
    options: DialogOptions & { prompt?: DialogPrompt },
  ) => {
    return new Promise<string | null>((resolve) => {
      nextId.current += 1;
      setRequest({ ...options, id: nextId.current, kind, settle: resolve });
    });
  }, []);

  const dialogs = React.useMemo<Dialogs>(() => ({
    notify: async (title, message) => {
      await open('notice', { title, message });
    },
    confirm: async options => await open('confirm', options) !== null,
    prompt: async (options) => {
      const value = await open('prompt', options);

      return value === null || value.trim() === '' ? null : value.trim();
    },
  }), [open]);

  // Hands the same three functions to the module-level `dialogs`, so an error
  // callback with no component around it can raise one too.
  React.useEffect(() => {
    setDialogController(dialogs);

    return () => setDialogController(null);
  }, [dialogs]);

  // Settled before the dialog is torn down, so an awaiting caller is never left
  // hanging by a re-render that drops the request first.
  const close = (value: string | null) => {
    request?.settle(value);
    setRequest(null);
  };

  return (
    <DialogContext value={dialogs}>
      {children}
      {request !== null && (
        <ConfirmDialog
          // A fresh identity per question, so a prompt never opens holding the
          // previous answer.
          key={request.id}
          visible
          title={request.title}
          message={request.message ?? ''}
          tone={request.tone ?? (request.kind === 'confirm' ? 'danger' : 'default')}
          icon={request.icon}
          confirmLabel={request.confirmLabel ?? (request.kind === 'notice' ? 'OK' : undefined)}
          // A notice has nothing to decline, so it gets one button.
          cancelLabel={request.kind === 'notice' ? null : request.cancelLabel ?? 'Cancel'}
          prompt={request.kind === 'prompt' ? request.prompt ?? {} : undefined}
          onConfirm={value => close(value)}
          onCancel={() => close(null)}
        />
      )}
    </DialogContext>
  );
}

/**
 * The dialogs, from anywhere under the provider.
 *
 * Throws rather than falling back to `Alert`: a silent fallback would let a
 * screen mounted outside the provider ship the system alert this exists to
 * replace, and nobody would notice until it was on a phone.
 */
export function useDialogs(): Dialogs {
  const dialogs = React.use(DialogContext);

  if (dialogs === null)
    throw new Error('useDialogs must be used inside <DialogProvider>');

  return dialogs;
}
