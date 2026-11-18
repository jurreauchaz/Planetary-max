import { createHash, randomBytes } from 'node:crypto';
import { openSync, writeFileSync, closeSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 1 || !['--local', '--remote'].includes(args[0])) {
  console.error('Usage: npm run admin:setup -- --local | --remote');
  console.error('Local creates .dev.vars only if it does not exist. Remote updates the configured Cloudflare Worker secrets.');
  process.exit(1);
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('An interactive terminal is required to enter your password privately.');
  process.exit(1);
}

function readPassword(prompt) {
  return new Promise((resolve, reject) => {
    let value = '';
    const wasRaw = process.stdin.isRaw;
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write(prompt);
    function finish(error) {
      process.stdin.removeListener('keypress', onKey);
      process.stdin.setRawMode(Boolean(wasRaw));
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    }
    function onKey(character, key = {}) {
      if ((key.ctrl && ['c', 'd'].includes(key.name)) || key.name === 'escape') return finish(new Error('Setup cancelled.'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') { value = Array.from(value).slice(0, -1).join(''); return; }
      if (!key.ctrl && !key.meta && character && !/[\x00-\x1f\x7f]/.test(character)) value += character;
    }
    process.stdin.on('keypress', onKey);
  });
}

try {
  const local = args[0] === '--local';
  console.log(local
    ? 'Set up a password for the local Preview. This creates .dev.vars and will not overwrite an existing file.'
    : 'Set up the administrator password for the Worker in wrangler.toml. This rotates the session secret and signs out existing administrators.');
  console.log('Use a unique password or passphrase of at least 24 characters. Save it in your password manager.');
  const password = await readPassword('Administrator password: ');
  const confirmation = await readPassword('Confirm password: ');
  if (password.length < 24 || password.length > 1024) throw new Error('Password must contain 24 to 1024 characters.');
  if (password !== confirmation) throw new Error('Passwords do not match. Nothing was saved.');
  const secrets = {
    ADMIN_PASSWORD_HASH: createHash('sha256').update(password, 'utf8').digest('hex'),
    JWT_SECRET: randomBytes(48).toString('base64url'),
  };
  if (local) {
    const destination = path.join(root, '.dev.vars');
    let fd;
    try {
      fd = openSync(destination, 'wx', 0o600);
      writeFileSync(fd, Object.entries(secrets).map(([key, value]) => `${key}=${value}\n`).join(''));
    } catch (error) {
      if (fd !== undefined) { closeSync(fd); fd = undefined; try { unlinkSync(destination); } catch {} }
      if (error.code === 'EEXIST') throw new Error('.dev.vars already exists. Preserve it or move it aside before setting up new local credentials.');
      throw error;
    } finally { if (fd !== undefined) closeSync(fd); }
    console.log('Local credentials saved. Restart the local Worker and open /#/admin.');
  } else {
    const require = createRequire(import.meta.url);
    const packageDirectory = path.dirname(require.resolve('wrangler/package.json'));
    const result = spawnSync(process.execPath, [path.join(packageDirectory, 'bin/wrangler.js'), 'secret', 'bulk'], {
      cwd: root, input: JSON.stringify(secrets), encoding: 'utf8', maxBuffer: 1024 * 1024,
    });
    if (result.error || result.status !== 0) throw new Error('Wrangler could not update the Worker secrets. Check Cloudflare authentication, account permissions, and the Worker configuration; then retry.');
    console.log('Cloudflare Worker secrets updated. Open /#/admin on the deployed site and use your password.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Administrator setup failed.');
  process.exitCode = 1;
}
