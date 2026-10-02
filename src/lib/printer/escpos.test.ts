import type { Collection } from '@/lib/hooks/api/use-payments';
import type { UpiAccount } from '@/lib/hooks/api/use-tenant-upi';
import { COLUMNS, encodeCp437, EscPos, transliterate, wrap } from './escpos';
import { buildReceipt, previewReceipt, upiUri } from './receipt';

/**
 * The printable characters of a byte stream, so a layout can be read back.
 *
 * Fixed-length ESC/GS commands are skipped whole rather than filtered byte by
 * byte: `ESC a 1` carries a literal 'a', and leaving it in makes every centred
 * line read as if the text began with one.
 */
function readable(bytes: Uint8Array): string {
  let out = '';

  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i]!;

    if (byte === 0x1B) {
      // ESC @ is two bytes; ESC a/E/! are three.
      i += bytes[i + 1] === 0x40 ? 1 : 2;
      continue;
    }

    if (byte === 0x1D && bytes[i + 1] === 0x21) {
      i += 2;
      continue;
    }

    if (byte >= 0x20 && byte <= 0x7E)
      out += String.fromCodePoint(byte);
    else if (byte === 0x0A)
      out += '\n';
  }

  return out;
}

function hasSequence(bytes: Uint8Array, sequence: number[]): boolean {
  return [...bytes].some((_, index) => sequence.every((byte, offset) => bytes[index + offset] === byte));
}

const upi: UpiAccount = {
  id: 'upi-1',
  upiId: 'satyacable@okhdfc',
  payeeName: 'Satya Cable Network',
  label: 'Counter',
  isDefault: true,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function collection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    customerId: 'cust-1',
    customerName: 'Kavitha Devi',
    customerCode: 'SSCN-0042',
    subscriptionId: 'sub-1',
    customerEquipmentId: null,
    equipment: null,
    serviceAccountNumber: 'ACT9001',
    locationId: null,
    locationPath: null,
    collectedBy: 'user-1',
    collectorName: 'Ravi Kumar',
    outcome: 'full',
    method: 'upi',
    dueAmount: '500.00',
    duesPaid: '500.00',
    accessoryAmount: '0.00',
    totalCollected: '500.00',
    balanceAfter: '0.00',
    transactionId: null,
    accessories: [],
    reversesId: null,
    reversedById: null,
    reason: null,
    notes: null,
    reference: 'ref-1',
    collectedAt: '2026-09-19T10:30:00.000Z',
    latitude: null,
    longitude: null,
    gpsAccuracyM: null,
    ...overrides,
  };
}

describe('folding text to the paper', () => {
  it('breaks at spaces without overflowing the line', () => {
    const lines = wrap('the quick brown fox jumps over the lazy dog', 16);

    expect(lines.every(line => line.length <= 16)).toBe(true);
    expect(lines.join(' ')).toBe('the quick brown fox jumps over the lazy dog');
  });

  it('cuts a word longer than the paper rather than letting it run off', () => {
    const lines = wrap('SN4411990022334455667788', 10);

    expect(lines).toEqual(['SN44119900', '2233445566', '7788']);
  });

  it('keeps deliberate line breaks', () => {
    expect(wrap('one\ntwo', 20)).toEqual(['one', 'two']);
  });
});

describe('what the printer can render', () => {
  it('turns the rupee sign into something CP437 actually has', () => {
    expect(transliterate('₹500.00')).toBe('Rs.500.00');
  });

  it('replaces an unrenderable glyph with a question mark, never a wrong one', () => {
    expect(encodeCp437('కవిత')).toEqual([0x3F, 0x3F, 0x3F, 0x3F]);
    expect(encodeCp437('AB')).toEqual([0x41, 0x42]);
  });
});

describe('the command stream', () => {
  it('right-aligns a value against the margin', () => {
    const doc = new EscPos(20).row('Total', 'Rs.500.00');

    expect(readable(doc.build())).toBe('Total      Rs.500.00\n');
  });

  it('gives an over-long row its own line rather than truncating it', () => {
    const text = readable(new EscPos(16).row('Service account', 'ACT900100200').build());

    expect(text.split('\n').filter(Boolean)).toEqual(['Service account', '    ACT900100200']);
  });

  it('emits the printer\'s own QR commands, not a bitmap', () => {
    const bytes = new EscPos(32).qr('upi://pay?pa=x@y').build();

    // GS ( k ... 1 P 0 is the "store the payload" function.
    expect(hasSequence(bytes, [0x1D, 0x28, 0x6B])).toBe(true);
    expect(readable(bytes)).toContain('upi://pay?pa=x@y');
  });

  it('carries the QR payload length as two little-endian bytes', () => {
    const bytes = new EscPos(32).qr('a'.repeat(300)).build();

    // 300 + 3 = 303 = 0x012F, so the store command carries 0x2F then 0x01.
    expect(hasSequence(bytes, [0x1D, 0x28, 0x6B, 0x2F, 0x01, 0x31, 0x50, 0x30])).toBe(true);
  });
});

describe('the UPI link on every receipt', () => {
  it('names the payee and the handle, and never the amount', () => {
    const uri = upiUri(upi, 'Satya Cable Network');

    expect(uri).toContain('pa=satyacable%40okhdfc');
    expect(uri).toContain('pn=Satya%20Cable%20Network');
    expect(uri).toContain('cu=INR');
    // A pre-filled amount is how somebody pays the same bill twice.
    expect(uri).not.toContain('am=');
  });
});

describe('a printed receipt', () => {
  it('shows the money as the customer would check it', () => {
    const text = readable(buildReceipt({
      receipt: collection(),
      businessName: 'Satya Cable',
      upi,
    }));

    expect(text).toContain('PAID Rs.500.00');
    expect(text).toContain('Kavitha Devi');
    expect(text).toContain('ACT9001');
    expect(text).toContain('Balance due');
  });

  it('prints the QR even when the payment was cash', () => {
    const bytes = buildReceipt({
      receipt: collection({ method: 'cash' }),
      businessName: 'Satya Cable',
      upi,
    });

    expect(readable(bytes)).toContain('satyacable@okhdfc');
    expect(readable(bytes)).toContain('upi://pay?pa=satyacable%40okhdfc');
  });

  it('leaves the QR off when the tenant has no handle', () => {
    const text = readable(buildReceipt({
      receipt: collection(),
      businessName: 'Satya Cable',
      upi: null,
    }));

    expect(text).not.toContain('Scan to pay');
  });

  it('itemises accessories against the total', () => {
    const text = readable(buildReceipt({
      receipt: collection({
        accessories: [{ catalogId: 'c1', name: 'Remote', quantity: 2, unitPrice: '150.00', amount: '300.00' }],
        accessoryAmount: '300.00',
        totalCollected: '800.00',
      }),
      businessName: 'Satya Cable',
      upi: null,
    }));

    expect(text).toContain('Remote x2');
    expect(text).toContain('Rs.300.00');
    expect(text).toContain('PAID Rs.800.00');
  });

  it('never lets a line run past the paper', () => {
    const text = previewReceipt({
      receipt: collection({ customerName: 'Venkata Satyanarayana Rao Chodavarapu Junior' }),
      businessName: 'Satya Cable & Broadband Network Mandapeta',
      upi,
    });

    expect(text.split('\n').every(line => line.length <= COLUMNS[58])).toBe(true);
  });

  it('previews the same numbers the paper carries', () => {
    const input = { receipt: collection(), businessName: 'Satya Cable', upi } as const;

    expect(previewReceipt(input)).toContain('PAID Rs.500.00');
    expect(readable(buildReceipt(input))).toContain('PAID Rs.500.00');
  });
});
