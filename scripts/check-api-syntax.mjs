/**
 * Syntax-checks every serverless function.
 *
 * `vite build` only bundles src/, so a syntax error in api/ ships happily and
 * blows up at runtime on Vercel. This catches it locally instead.
 *
 *   npm run check:api
 */
import { readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = '\x1b[32m', R = '\x1b[31m', X = '\x1b[0m';

async function jsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await jsFiles(full)));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = await jsFiles(path.join(root, 'api'));
let failed = 0;

for (const file of files.sort()) {
  // split/join rather than a regex: no backslash to be mangled in transit
  const rel = path.relative(root, file).split(path.sep).join('/');
  try {
    await run(process.execPath, ['--check', file]);
    console.log(`  ${G}OK${X}   ${rel}`);
  } catch (error) {
    failed += 1;
    console.log(`  ${R}FAIL${X} ${rel}`);
    const detail = String(error.stderr || error.message).split('\n').slice(0, 4).join('\n');
    console.log(`       ${detail.replace(/\n/g, '\n       ')}`);
  }
}

console.log('');
if (failed) {
  console.log(`${R}${failed} of ${files.length} serverless function(s) have syntax errors.${X}\n`);
  process.exit(1);
}
console.log(`${G}All ${files.length} serverless functions parse cleanly.${X}\n`);
