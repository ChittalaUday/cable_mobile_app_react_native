/**
 * ESC/POS command building for 58mm and 80mm thermal receipt printers.
 *
 * Pure bytes in, pure bytes out — no Bluetooth, no React. Everything that can
 * be wrong about a receipt (a total that does not add up, a line that wraps off
 * the paper, a QR nobody can scan) is decided here, where a test can read it,
 * rather than on a printer nobody has in CI.
 */

/** Characters that fit on one line at font A, by paper width. */
export const COLUMNS = { 58: 32, 80: 48 } as const;
export type PaperWidth = keyof typeof COLUMNS;

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

export type Align = 'left' | 'center' | 'right';

const ALIGN: Record<Align, number> = { left: 0, center: 1, right: 2 };

/**
 * Builds one receipt's byte stream.
 *
 * A builder rather than string concatenation because ESC/POS is a binary
 * protocol: `\n` is a byte, not a newline, and a rupee sign is not ASCII.
 */
export class EscPos {
  private readonly bytes: number[] = [];

  constructor(readonly columns: number = COLUMNS[58]) {}

  /** Resets the printer, so a previous job's bold or double-height cannot leak in. */
  init(): this {
    return this.push(ESC, 0x40);
  }

  align(how: Align): this {
    return this.push(ESC, 0x61, ALIGN[how]);
  }

  bold(on: boolean): this {
    return this.push(ESC, 0x45, on ? 1 : 0);
  }

  /** Doubles the glyph box. Used for the one number the customer checks. */
  double(on: boolean): this {
    return this.push(GS, 0x21, on ? 0x11 : 0x00);
  }

  /**
   * Writes text, wrapped to the paper rather than run off the edge.
   *
   * Encoded as CP437 — the default code page of every cheap ESC/POS printer.
   * Anything outside it (a rupee sign, a Telugu name) is transliterated rather
   * than sent raw, because raw high bytes print as mojibake, not as nothing.
   */
  text(value: string, align: Align = 'left'): this {
    this.align(align);

    for (const line of wrap(transliterate(value), this.columns))
      this.push(...encodeCp437(line), LF);

    return this;
  }

  /** A label on the left and its value hard against the right margin. */
  row(label: string, value: string): this {
    this.align('left');

    for (const line of layoutRow(label, value, this.columns))
      this.push(...encodeCp437(line), LF);

    return this;
  }

  rule(character = '-'): this {
    return this.text(character.repeat(this.columns));
  }

  feed(lines = 1): this {
    return this.push(...Array.from({ length: lines }, () => LF));
  }

  /**
   * A QR code the printer draws itself.
   *
   * The alternative is rasterising one here and sending it as a bitmap, which
   * is an order of magnitude more bytes over a 9600-baud serial link and comes
   * out soft. `size` is 1–16 dots per module; 6 scans reliably off 58mm paper.
   */
  qr(payload: string, size = 6): this {
    const data = encodeCp437(payload);
    // Store length is the payload plus the two bytes of the function itself.
    const length = data.length + 3;

    return this
      // Model 2.
      .push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00)
      // Module size.
      .push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, clamp(size, 1, 16))
      // Error correction M — survives a thumbprint on a paper receipt.
      .push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31)
      // Store the payload.
      .push(GS, 0x28, 0x6B, length & 0xFF, (length >> 8) & 0xFF, 0x31, 0x50, 0x30, ...data)
      // Print what was stored.
      .push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
  }

  /** Feeds clear of the tear bar and cuts, for printers that have a cutter. */
  cut(): this {
    return this.feed(3).push(GS, 0x56, 0x42, 0x00);
  }

  build(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }

  private push(...bytes: number[]): this {
    this.bytes.push(...bytes);

    return this;
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/**
 * Folds text to the paper width, breaking at spaces where it can.
 *
 * A word longer than the line (a serial number, a UPI handle) is cut rather
 * than allowed to overflow — a printer silently drops what runs past the
 * margin, so an un-wrapped account number prints as a shorter wrong one.
 */
export function wrap(value: string, columns: number): string[] {
  const lines: string[] = [];

  for (const paragraph of value.split('\n')) {
    // Already fits: returned untouched, so the padding that right-aligns a
    // value survives. Splitting on spaces would eat it.
    if (paragraph.length <= columns) {
      lines.push(paragraph);
      continue;
    }

    let line = '';

    for (const word of paragraph.split(' ')) {
      let rest = word;

      while (rest.length > columns) {
        if (line !== '') {
          lines.push(line);
          line = '';
        }
        lines.push(rest.slice(0, columns));
        rest = rest.slice(columns);
      }

      if (line === '') {
        line = rest;
      }
      else if (line.length + 1 + rest.length <= columns) {
        line += ` ${rest}`;
      }
      else {
        lines.push(line);
        line = rest;
      }
    }

    lines.push(line);
  }

  return lines;
}

/**
 * One `label ............ value` row, folded to the paper.
 *
 * Shared by the byte stream and the on-screen preview, so the two cannot drift
 * into disagreeing about where a long customer name breaks — a preview that
 * differs from the paper is worse than no preview.
 */
export function layoutRow(label: string, value: string, columns: number): string[] {
  const left = transliterate(label);
  const right = transliterate(value);
  const gap = columns - left.length - right.length;

  if (gap >= 1)
    return [left + ' '.repeat(gap) + right];

  // Too wide for one line. The label wraps normally and the value follows on
  // its own line, still hard against the right margin.
  const tail = wrap(right, columns);
  const last = tail.pop() ?? '';

  return [...wrap(left, columns), ...tail, last.padStart(columns)];
}

/**
 * Replaces what CP437 has no glyph for.
 *
 * `₹` is the one that matters: it is not in any code page these printers ship
 * with, and sending it raw prints a box or nothing at all. "Rs." is what every
 * paper receipt in the country already says.
 */
export function transliterate(value: string): string {
  return value
    .replaceAll('₹', 'Rs.')
    .replaceAll('—', '-')
    .replaceAll('–', '-')
    .replaceAll(/[‘’]/g, '\'')
    .replaceAll(/[“”]/g, '"')
    .replaceAll('…', '...')
    .replaceAll('•', '*');
}

/**
 * ASCII passes through; anything else becomes `?`.
 *
 * A name the printer cannot render is better as `?` than as a random glyph from
 * whatever code page the printer happened to boot in — the first is obviously
 * missing, the second reads as a different name.
 */
export function encodeCp437(value: string): number[] {
  return [...value].map((character) => {
    const code = character.codePointAt(0) ?? 0x3F;

    return code >= 0x20 && code <= 0x7E ? code : 0x3F;
  });
}
