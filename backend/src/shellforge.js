/**
 * shellforge.js  –  Node.js wrapper around the compiled C adapter.
 *
 * Spawns shellforge_adapter once per API call, sends one JSON line to
 * stdin, reads one JSON line from stdout, and resolves the promise.
 *
 * The C adapter handles all path-safety guarantees, so this layer is
 * intentionally thin.  No user-controlled strings are ever passed to
 * a shell.  We exec the adapter binary directly with an argument array.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* Absolute path to the compiled adapter binary */
const ADAPTER_BIN = join(__dirname, '..', 'shellforge_adapter');

/* Workspace root – can be overridden via env var */
export const WORKSPACE = process.env.SHELLFORGE_WORKSPACE || '/tmp/shellforge_ws';

/**
 * Call the C adapter with a given operation and arguments.
 *
 * @param {string} op   – one of: list stat read write mkdir touch remove copy move chmod find
 * @param {string[]} args – positional arguments for the operation
 * @returns {Promise<any>}  – resolves with parsed data or rejects with Error
 */
export async function callAdapter(op, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(ADAPTER_BIN, [], {
      env: { ...process.env, SHELLFORGE_WORKSPACE: WORKSPACE },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error(
          `Adapter binary not found at ${ADAPTER_BIN}.\n` +
          `Run: cd backend && gcc -Wall -Wextra -O2 shellforge_adapter.c -o shellforge_adapter`
        ));
      } else {
        reject(new Error(`Adapter exec error: ${err.message}`));
      }
    });

    child.on('close', (code) => {
      if (!stdout.trim()) {
        reject(new Error(`Adapter produced no output (exit ${code}). stderr: ${stderr}`));
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch (e) {
        reject(new Error(`Adapter returned invalid JSON: ${stdout.slice(0, 200)}`));
        return;
      }
      if (parsed.ok) {
        resolve(parsed.data);
      } else {
        reject(new Error(parsed.error || 'Unknown adapter error'));
      }
    });

    /* Write request to adapter stdin */
    const request = JSON.stringify({ op, args: args.map(String) });
    child.stdin.write(request + '\n');
    child.stdin.end();
  });
}
