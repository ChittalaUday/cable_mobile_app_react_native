import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = path.resolve(process.argv[2] ?? path.join(mobileRoot, '../cable-backend'));
const schema = path.join(mobileRoot, 'api/openapi.json');
function run(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit' });
  if (result.error)
    throw result.error;
  if (result.status !== 0)
    process.exit(result.status ?? 1);
}
// Use the backend's configured database; exporting only builds routes and reads the spec.
run(['--env-file-if-exists=.env', '--import', 'tsx', 'scripts/export-openapi.ts', schema], backendRoot);
run(['node_modules/openapi-typescript/bin/cli.js', schema, '-o', 'src/lib/api/schema.generated.ts', '--default-non-nullable', 'false'], mobileRoot);
