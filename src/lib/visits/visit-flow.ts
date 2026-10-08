import type { RecordVisitPayload, VisitAction, VisitPurpose } from '@/lib/hooks/api/use-visits';
import { create } from 'zustand';
import { dialogs } from '@/components/common/dialogs';
import { recordVisit } from '@/lib/hooks/api/use-visits';

export type VisitTarget = {
  customerId: string;
  customerName?: string | null;
  subscriptionId?: string;
  ticketId?: string;
  /** Why the door is on the round — from the server, never asked. */
  purpose: VisitPurpose;
  /** The job that settles it, from the server; null when the visit is only logged. */
  action: VisitAction | null;
};

/** The action itself, or one of the outcomes that mean it was not done. */
export type VisitChoice = 'action' | 'not_available' | 'refused' | 'come_later' | 'other';

export type VisitDraft = {
  choice: VisitChoice;
  notes: string;
  /** Key into the sheet's come-back options; "come later" always has one, tomorrow unless changed. */
  next: string;
  /** A local `YYYY-MM-DD` value when the custom come-back option is selected. */
  nextVisitDate: string | null;
  /** What was fixed, for a complaint. */
  resolution: string;
  /** The complaint is already resolved on the server: a retry must not resolve it again. */
  resolved: boolean;
};

type Active = {
  target: VisitTarget;
  /** `form` while the sheet is up, `working` while the payment flow has the screen. */
  stage: 'form' | 'working';
  draft: VisitDraft;
  /** One reference per visit: a retry replays it instead of logging a second. */
  reference: string;
  /** Where the phone was when the visit was set up; sent with the visit that follows a payment. */
  gps: Pick<RecordVisitPayload, 'latitude' | 'longitude' | 'gpsAccuracyM'> | null;
};

type VisitFlow = {
  active: Active | null;
  start: (target: VisitTarget, reference: string) => void;
  patch: (draft: Partial<VisitDraft>) => void;
  launch: (gps: Active['gps']) => void;
  clear: () => void;
};

/**
 * Everything typed into a visit, held in memory only while the visit is being
 * marked — including while the payment screen has the stage. Finishing the job
 * or cancelling clears it; nothing is written to disk, so a killed app starts
 * clean.
 */
export const useVisitFlow = create<VisitFlow>(set => ({
  active: null,
  start: (target, reference) => set({
    active: {
      target,
      stage: 'form',
      reference,
      gps: null,
      draft: { choice: target.action === null ? 'not_available' : 'action', notes: '', next: 'tomorrow', nextVisitDate: null, resolution: '', resolved: false },
    },
  }),
  patch: draft => set(state => state.active === null ? state : { active: { ...state.active, draft: { ...state.active.draft, ...draft } } }),
  launch: gps => set(state => state.active === null ? state : { active: { ...state.active, stage: 'working', gps } }),
  clear: () => set({ active: null }),
}));

export const clearVisitFlow = () => useVisitFlow.getState().clear();

/**
 * A payment was recorded for this customer: if a visit was waiting on it, the
 * visit is now done and carries the payment's id. `charge` is what the payment
 * was for, since only some visits are settled by it. Quiet when nothing was waiting, so the payment flow can
 * call it unconditionally.
 */
export async function completeVisitAfterPayment(customerId: string, collectionId: string, charge: 'subscription' | 'equipment'): Promise<void> {
  const { active } = useVisitFlow.getState();
  if (active === null || active.stage !== 'working' || active.target.action !== 'collect_payment' || active.target.customerId !== customerId)
    return;
  // A bill is settled by dues; an installation by what the fitting cost, which is an equipment charge.
  if (charge === 'equipment' && active.target.purpose !== 'installation')
    return;

  const { target, draft, reference, gps } = active;
  clearVisitFlow();
  try {
    await recordVisit(customerId, {
      purpose: target.purpose,
      outcome: 'done',
      // The visit names the payment that settled it; the server refuses a done bill without one.
      collectionId,
      reference,
      latitude: gps?.latitude ?? 0,
      longitude: gps?.longitude ?? 0,
      gpsAccuracyM: gps?.gpsAccuracyM ?? 0,
      ...(target.subscriptionId === undefined ? {} : { subscriptionId: target.subscriptionId }),
      ...(target.ticketId === undefined ? {} : { ticketId: target.ticketId }),
      ...(draft.notes.trim() === '' ? {} : { notes: draft.notes.trim() }),
    });
    void dialogs.notify('Visit completed', 'The payment is recorded and the visit is marked done.');
  }
  catch {
    void dialogs.notify('Payment recorded', 'The visit was not marked done. Mark it again from the round.');
  }
}
