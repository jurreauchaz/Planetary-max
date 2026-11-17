// Run against a disposable, migrated local Wrangler instance.
import assert from 'node:assert/strict';
const base = process.env.SMOKE_URL || 'http://localhost:8787';
async function request(path, body, expected = 200, origin = base) {
  const response = await fetch(`${base}${path}`, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body),
  });
  assert.equal(response.status, expected, `${path}: ${await response.clone().text()}`);
  return response.json();
}
const { artworks } = await request('/api/artworks');
assert.ok(artworks.length >= 4);
assert.ok(artworks.every(art => !('access_token' in art) && !('buyer_email' in art)));
const { telemetry } = await request('/api/telemetry');
assert.equal(telemetry.find(metric => metric.metric_key === 'heart_rate_bpm').value, 142);
await request('/api/sovereign/checkout', { item_id: 'art_001', buyer_email: 'collector@example.test' }, 403, 'https://invalid.example');
await request('/api/sovereign/checkout', { item_id: 'art_001', buyer_email: 'invalid' }, 400);
await request('/api/sovereign/checkout', { item_id: 'missing', buyer_email: 'collector@example.test' }, 409);
await request('/api/sovereign/checkout', { item_id: 'art_001', buyer_email: 'collector@example.test', amount: 1 }, 400);
const { transaction } = await request('/api/sovereign/checkout', { item_id: 'art_001', buyer_email: 'collector@example.test' }, 201);
assert.equal(transaction.status, 'pending');
assert.equal((await request('/api/artworks')).artworks.find(art => art.id === 'art_001').status, 'available');
await request('/api/artworks', { title: '' }, 400);
await request('/api/artworks', { creator: 'maxjurreau', title: 'Smoke artwork', medium: 'Digital', category: 'Digital', price_cents: 2500, image_url: 'https://example.test/art.png', provenance_hash: 'a'.repeat(64) }, 201);
assert.ok((await request('/api/artworks')).artworks.some(art => art.title === 'Smoke artwork' && art.category === 'Digital'));
await request('/api/chess/games', { pgn: 'not chess' }, 400);
const saved = await request('/api/chess/games', { pgn: '1. e4 e5' }, 201);
assert.match(saved.fen, /4p3/);
assert.ok((await request('/api/chess/games')).games.some(game => game.id === saved.id && game.pgn_data === '1. e4 e5'));
const deepLink = await fetch(`${base}/workspaces/art`, { headers: { Accept: 'text/html' } });
assert.equal(deepLink.status, 200);
assert.match(await deepLink.text(), /id="app"/);
await request('/api/missing', undefined, 404);
console.log('Sovereign smoke passed: seeded reads, listing, checkout boundaries, game persistence and SPA fallback.');
