// Exercises a disposable LOCAL Wrangler/D1 instance; provisions a synthetic node
// and removes all of its ledger/nonce fixtures afterwards. No provider calls.
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const base = process.env.SMOKE_URL || 'http://localhost:8787';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local verification only');
const nodeId = `native-smoke-${randomUUID()}`;
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const encodedKey = publicKey.export({ format: 'jwk' }).x;
function sql(command) {
  return JSON.parse(execFileSync('npx', ['--no-install', 'wrangler', 'd1', 'execute', 'planetary_max_root_db', '--local', '--json', '--command', command], { encoding: 'utf8' }));
}
const path = '/api/sovereign/settle';
const payload = { item_id: 'native-ledger-fixture', amount: 100, actor_id: nodeId };
function signed(body, key = 'native-smoke-key') {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const hash = createHash('sha256').update(body).digest('hex');
  const signature = sign(null, Buffer.from(`${timestamp}\n${nonce}\nPOST\n${path}\n${hash}`), privateKey).toString('base64url');
  return { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Max-Node-Id': nodeId, 'X-Max-Timestamp': timestamp, 'X-Max-Nonce': nonce, 'X-Max-Node-Signature': signature, ...(key ? { 'Idempotency-Key': key } : {}) }, body };
}
async function request(body, status, key) {
  const response = await fetch(base + path, signed(typeof body === 'string' ? body : JSON.stringify(body), key));
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}
sql(`INSERT INTO trusted_nodes(node_id, public_key_b64, status, created_at, updated_at) VALUES ('${nodeId}', '${encodedKey}', 'ACTIVE', 0, 0)`);
try {
  assert.equal((await fetch(base + path, { method: 'POST', body: JSON.stringify(payload) })).status, 401);
  const tampered = signed(JSON.stringify(payload));
  tampered.body = JSON.stringify({ ...payload, amount: 101 });
  assert.equal((await fetch(base + path, tampered)).status, 401);
  await request('{', 400);
  await request({ ...payload, actor_id: 'spoofed-node' }, 403);
  for (const amount of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, '100']) await request({ ...payload, amount }, 400);
  await request({ ...payload, currency: 'USD' }, 400);
  await request({ ...payload, item_id: '' }, 400);
  await request(payload, 400, '');
  const first = await request(payload, 200);
  assert.equal(first.status, 'SETTLED_NATIVE');
  assert.equal(first.currency, 'SOV_CREDIT');
  assert.equal(first.settlement, 'DIRECT_ATOMIC_D1');
  assert.equal(first.funds_transferred, false);
  const retried = await request(payload, 200);
  assert.equal(retried.transaction_id, first.transaction_id);
  assert.equal(retried.timestamp, first.timestamp);
  const concurrent = await Promise.all(Array.from({ length: 4 }, () => request(payload, 200)));
  assert.ok(concurrent.every(record => record.transaction_id === first.transaction_id));
  await request({ ...payload, amount: 101 }, 409);
  const replay = signed(JSON.stringify(payload), 'native-replay-key');
  assert.equal((await fetch(base + path, replay)).status, 200);
  assert.equal((await fetch(base + path, replay)).status, 409);
  const rows = sql(`SELECT item_id, amount, currency, status, actor_id, artwork_id FROM transactions WHERE actor_id = '${nodeId}'`)[0].results;
  assert.equal(rows.length, 2);
  assert.ok(rows.every(row => row.status === 'SETTLED_NATIVE' && row.amount === 100 && row.actor_id === nodeId && row.artwork_id === null));
  sql(`UPDATE trusted_nodes SET status = 'REVOKED' WHERE node_id = '${nodeId}'`);
  await request(payload, 403, 'revoked-node');
  console.log('PASS: real signed native settlement, validation, actor binding, idempotency/concurrent retries, nonce replay and persisted D1 records.');
} finally {
  sql(`DELETE FROM transactions WHERE actor_id = '${nodeId}'; DELETE FROM trusted_nodes WHERE node_id = '${nodeId}'`);
}
