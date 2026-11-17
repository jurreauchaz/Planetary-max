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
let path = '/api/sovereign/credit-settle';
const payload = { item_id: 'native-ledger-fixture', amount: 100, actor_id: nodeId };
function signed(body, key = 'native-smoke-key', timestamp = String(Date.now())) {
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
  assert.equal((await fetch(base + path, { method: 'POST', headers: { Authorization: 'Bearer SOV-anything' }, body: JSON.stringify(payload) })).status, 401);
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
  // The old endpoint shares the same idempotency namespace and ledger.
  path = '/api/sovereign/settle';
  const legacyRetry = await request(payload, 200);
  assert.equal(legacyRetry.transaction_id, first.transaction_id);
  path = '/api/sovereign/credit-settle';
  // A future-dated signature remains valid until timestamp + skew. Its nonce
  // must stay recorded throughout that entire period.
  const futureTimestamp = String(Date.now() + 240_000);
  const future = signed(JSON.stringify(payload), 'native-smoke-key', futureTimestamp);
  assert.equal((await fetch(base + path, future)).status, 200);
  const nonceRow = sql(`SELECT expires_at FROM node_signature_nonces WHERE node_id = '${nodeId}' AND nonce = '${future.headers['X-Max-Nonce']}'`)[0].results[0];
  assert.ok(nonceRow.expires_at >= Number(futureTimestamp) + 300_000);
  const concurrent = await Promise.all(Array.from({ length: 4 }, () => request(payload, 200)));
  assert.ok(concurrent.every(record => record.transaction_id === first.transaction_id));
  await request({ ...payload, amount: 101 }, 409);
  const replay = signed(JSON.stringify(payload), 'native-replay-key');
  assert.equal((await fetch(base + path, replay)).status, 200);
  assert.equal((await fetch(base + path, replay)).status, 409);
  const transfer = { recipient_id: 'recipient-' + 'x'.repeat(90), amount: 100, memo: 'art credit' };
  await request({ ...transfer, recipient_id: ' ' }, 400, 'transfer-invalid');
  await request({ ...transfer, memo: 'x'.repeat(501) }, 400, 'transfer-invalid');
  const recorded = await request(transfer, 200, 'transfer-key');
  assert.equal(recorded.sender, nodeId);
  assert.equal(recorded.recipient, transfer.recipient_id);
  assert.equal(recorded.memo, transfer.memo);
  assert.equal(recorded.settlement_id, recorded.transaction_id);
  assert.equal(recorded.funds_transferred, false);
  assert.equal((await request(transfer, 200, 'transfer-key')).settlement_id, recorded.settlement_id);
  await request({ ...transfer, recipient_id: 'someone-else' }, 409, 'transfer-key');
  await request({ ...transfer, memo: 'changed' }, 409, 'transfer-key');
  await request(payload, 409, 'transfer-key');
  const rows = sql(`SELECT item_id, amount, currency, status, actor_id, artwork_id, recipient_id, memo FROM transactions WHERE actor_id = '${nodeId}'`)[0].results;
  assert.equal(rows.length, 3);
  assert.ok(rows.every(row => row.status === 'SETTLED_NATIVE' && row.amount === 100 && row.actor_id === nodeId && row.artwork_id === null));
  assert.equal(rows.find(row => row.recipient_id === transfer.recipient_id).memo, transfer.memo);
  sql(`UPDATE trusted_nodes SET status = 'REVOKED' WHERE node_id = '${nodeId}'`);
  await request(payload, 403, 'revoked-node');
  console.log('PASS: real signed native settlement, validation, actor binding, idempotency/concurrent retries, nonce replay and persisted D1 records.');
} finally {
  sql(`DELETE FROM transactions WHERE actor_id = '${nodeId}'; DELETE FROM trusted_nodes WHERE node_id = '${nodeId}'`);
}
