import type { PaperWidth } from './escpos';
import type { Collection } from '@/lib/hooks/api/use-payments';
import type { UpiAccount } from '@/lib/hooks/api/use-tenant-upi';
import { COLUMNS, EscPos, layoutRow, transliterate, wrap } from './escpos';

export type ReceiptInput = {
  receipt: Collection;
  /** The operator's name, printed at the head so a customer knows who took it. */
  businessName: string;
  /** Printed under the total as a QR, so the next payment needs no cash. */
  upi: UpiAccount | null;
  paper?: PaperWidth;
};

/** Rupees with paise, ASCII only — the printer has no ₹ glyph. */
function money(value: string | number): string {
  const paise = Math.round(Number(value || 0) * 100);
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);

  return `${sign}Rs.${Math.trunc(abs / 100).toLocaleString('en-IN')}.${String(abs % 100).padStart(2, '0')}`;
}

function when(iso: string): string {
  const at = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${pad(at.getDate())}/${pad(at.getMonth() + 1)}/${at.getFullYear()} ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/**
 * The `upi://` URI every Indian payment app understands.
 *
 * `am` is left off deliberately: the customer scans this to pay their *next*
 * bill, not the one just settled, and a pre-filled amount equal to what they
 * have already handed over is how somebody pays twice.
 */
export function upiUri(account: UpiAccount, note?: string): string {
  const params = new URLSearchParams({
    pa: account.upiId,
    pn: account.payeeName,
    cu: 'INR',
  });

  if (note != null && note !== '')
    params.set('tn', note);

  // URLSearchParams uses `+` for spaces; UPI apps want percent-encoding.
  return `upi://pay?${params.toString().replaceAll('+', '%20')}`;
}

/**
 * Lays out one receipt.
 *
 * Built as bytes rather than a string because the QR is a binary command, and
 * returned whole so the preview on screen and the paper come from the same
 * function — a preview that is assembled separately is a preview that lies.
 */
export function buildReceipt({ receipt, businessName, upi, paper = 58 }: ReceiptInput): Uint8Array {
  const columns = COLUMNS[paper];
  const doc = new EscPos(columns);

  doc.init();

  doc.align('center').bold(true).text(businessName, 'center').bold(false);
  doc.text('PAYMENT RECEIPT', 'center');
  doc.rule('=');

  doc.row('Receipt', receipt.id.replaceAll('-', '').slice(0, 10).toUpperCase());
  doc.row('Date', when(receipt.collectedAt));

  if (receipt.customerName != null)
    doc.row('Customer', receipt.customerName);

  if (receipt.customerCode != null)
    doc.row('Code', receipt.customerCode);

  if (receipt.serviceAccountNumber != null)
    doc.row('Account', receipt.serviceAccountNumber);

  if (receipt.collectorName != null)
    doc.row('Collected by', receipt.collectorName);

  doc.rule();

  if (Number(receipt.duesPaid) !== 0)
    doc.row('Subscription', money(receipt.duesPaid));

  for (const line of receipt.accessories)
    doc.row(`${line.name} x${line.quantity}`, money(line.amount));

  if (Number(receipt.accessoryAmount) !== 0 && receipt.accessories.length === 0)
    doc.row('Equipment', money(receipt.accessoryAmount));

  doc.rule();

  doc.align('center').bold(true).double(true);
  doc.text(`PAID ${money(receipt.totalCollected)}`, 'center');
  doc.double(false).bold(false);

  if (receipt.method != null)
    doc.row('Paid by', receipt.method.replace('_', ' ').toUpperCase());

  doc.row('Balance due', money(receipt.balanceAfter));

  if (receipt.notes != null && receipt.notes !== '') {
    doc.rule();
    doc.text(receipt.notes);
  }

  // Every print carries the handle, whether or not this payment was UPI: the
  // receipt is the thing that stays in the customer's hand until next month.
  if (upi !== null) {
    doc.rule();
    doc.text('Scan to pay next time', 'center');
    doc.align('center').qr(upiUri(upi, businessName));
    doc.feed(1);
    doc.text(upi.upiId, 'center');
    doc.text(upi.payeeName, 'center');
  }

  doc.rule('=');
  doc.text('Keep this receipt. It cannot be re-issued.', 'center');
  doc.cut();

  return doc.build();
}

/**
 * The same receipt as plain text, for the on-screen preview.
 *
 * Rendered from the same values and the same column width, so what the
 * collector approves is what the paper says. The QR is shown as a placeholder
 * line because the screen draws the real one as an image beside it.
 */
export function previewReceipt({ receipt, businessName, upi, paper = 58 }: ReceiptInput): string {
  const columns = COLUMNS[paper];
  const lines: string[] = [];

  const centre = (value: string) => {
    for (const line of wrap(transliterate(value), columns))
      lines.push(line.padStart(Math.floor((columns + line.length) / 2)));
  };
  const row = (label: string, value: string) => lines.push(...layoutRow(label, value, columns));
  const rule = (character = '-') => lines.push(character.repeat(columns));

  centre(businessName);
  centre('PAYMENT RECEIPT');
  rule('=');

  row('Receipt', receipt.id.replaceAll('-', '').slice(0, 10).toUpperCase());
  row('Date', when(receipt.collectedAt));

  if (receipt.customerName != null)
    row('Customer', receipt.customerName);

  if (receipt.customerCode != null)
    row('Code', receipt.customerCode);

  if (receipt.serviceAccountNumber != null)
    row('Account', receipt.serviceAccountNumber);

  if (receipt.collectorName != null)
    row('Collected by', receipt.collectorName);

  rule();

  if (Number(receipt.duesPaid) !== 0)
    row('Subscription', money(receipt.duesPaid));

  for (const line of receipt.accessories)
    row(`${line.name} x${line.quantity}`, money(line.amount));

  if (Number(receipt.accessoryAmount) !== 0 && receipt.accessories.length === 0)
    row('Equipment', money(receipt.accessoryAmount));

  rule();
  centre(`PAID ${money(receipt.totalCollected)}`);

  if (receipt.method != null)
    row('Paid by', receipt.method.replace('_', ' ').toUpperCase());

  row('Balance due', money(receipt.balanceAfter));

  if (receipt.notes != null && receipt.notes !== '') {
    rule();
    lines.push(...wrap(transliterate(receipt.notes), columns));
  }

  if (upi !== null) {
    rule();
    centre('Scan to pay next time');
    centre('[ QR ]');
    centre(upi.upiId);
    centre(upi.payeeName);
  }

  rule('=');
  centre('Keep this receipt. It cannot be re-issued.');

  return lines.join('\n');
}
