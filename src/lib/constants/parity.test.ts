import fs from 'node:fs';
import path from 'node:path';

/**
 * The mobile vocabularies must match the backend's, value for value.
 *
 * Two repositories cannot import from each other, so these lists are mirrored
 * by hand — and mirrors drift. When this check was first written it found three
 * that already had: the app's `InventoryStatus` was missing `lost`, its
 * `StockMovementType` was missing three movements, and its
 * `CustomerEquipmentStatus` listed two values the API has never sent. Nothing
 * failed loudly; screens just rendered a status they had no label for.
 *
 * Skipped when the backend is not checked out beside this repo, so CI without
 * it stays green rather than failing for the wrong reason.
 */

const BACKEND = path.resolve(__dirname, '../../../../cable-backend/src/shared/constants');
const MIRRORED = ['crm', 'geo', 'tenancy', 'inventory', 'remotes', 'auth'] as const;

/** Every `export const NAME = [...] as const` in a file, as a name → values map. */
function readConstants(file: string): Record<string, string[]> {
  const source = fs.readFileSync(file, 'utf8');
  const found: Record<string, string[]> = {};

  for (const match of source.matchAll(/export const ([A-Z_]+) = (\[[\s\S]*?\]) as const/g)) {
    found[match[1]!] = [...match[2]!.matchAll(/'([^']*)'/g)].map(value => value[1]!);
  }
  return found;
}

const available = fs.existsSync(BACKEND);
const describeIfAvailable = available ? describe : describe.skip;

describeIfAvailable('constants mirror the backend', () => {
  it.each(MIRRORED)('%s.ts', (name) => {
    const backend = readConstants(path.join(BACKEND, `${name}.ts`));
    const mobile = readConstants(path.join(__dirname, `${name}.ts`));

    // Only what the app actually mirrors: the backend may carry vocabularies
    // no screen has needed yet, and that is not drift. Compared as one object so
    // a failure names every constant that moved, not just the first.
    const theirs: Record<string, string[] | undefined> = {};
    for (const constant of Object.keys(mobile))
      theirs[constant] = backend[constant];

    expect(mobile).toEqual(theirs);
  });
});
