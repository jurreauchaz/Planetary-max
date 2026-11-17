#!/usr/bin/env python3
"""Check native-ledger migration against populated legacy transaction data."""
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
db = sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
for path in sorted((root / 'migrations').glob('*.sql')):
    if path.name >= '0019_native_settlement.sql':
        break
    db.executescript(path.read_text())
for identifier, status in enumerate(('pending', 'confirmed', 'failed'), 1):
    db.execute('INSERT INTO transactions(id, artwork_id, buyer_email, tx_reference, created_at, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
               (identifier, 'art_001', 'legacy@example.test', f'legacy-{identifier}', 1000, 1800, 'USDC', status))
db.execute("INSERT INTO transactions(id, artwork_id, buyer_email, tx_reference, created_at) VALUES (99, 'art_001', 'deleted@example.test', 'deleted-reference', 1000)")
db.execute('DELETE FROM transactions WHERE id=99')
projection = 'id, artwork_id, item_id, buyer_email, tx_reference, created_at, amount, currency, status'
before = db.execute(f'SELECT {projection} FROM transactions ORDER BY id').fetchall()
db.executescript((root / 'migrations/0019_native_settlement.sql').read_text())
assert db.execute(f'SELECT {projection} FROM transactions ORDER BY id').fetchall() == before
# Original marketplace constraints and confirmed-payment writes still work.
db.execute("INSERT INTO transactions(artwork_id,item_id,buyer_email,tx_reference,created_at,amount,currency,status) VALUES ('art_001','art_001','buyer@example.test','verified',0,1800,'USDC','confirmed')")
assert db.execute("SELECT id FROM transactions WHERE tx_reference='verified'").fetchone()[0] == 100

def rejects(statement, args=()):
    try:
        db.execute(statement, args)
    except sqlite3.IntegrityError:
        return
    raise AssertionError('Ledger constraint was bypassed')

rejects("INSERT INTO transactions(item_id, tx_reference, created_at, status) VALUES ('unlinked', 'bad-legacy', 0, 'confirmed')")
rejects("INSERT INTO transactions(artwork_id, item_id, buyer_email, tx_reference, created_at) VALUES ('art_001', 'other', 'buyer@example.test', 'bad-link', 0)")
db.execute("INSERT INTO trusted_nodes(node_id, public_key_b64, status, created_at, updated_at) VALUES ('native-test', 'test-key', 'ACTIVE', 0, 0)")
insert = "INSERT INTO transactions(item_id, amount, currency, actor_id, status, tx_reference, created_at) VALUES ('MAX-FINANCE', ?, ?, ?, 'SETTLED_NATIVE', ?, 0)"
for args in [(0, 'SOV_CREDIT', 'native-test', 'zero'), (1.5, 'SOV_CREDIT', 'native-test', 'fraction'), (1, 'USD', 'native-test', 'fiat'), (1, 'SOV_CREDIT', 'unknown', 'unknown')]:
    rejects(insert, args)
db.execute(insert, (100, 'SOV_CREDIT', 'native-test', 'native-good'))
rejects(insert, (100, 'SOV_CREDIT', 'native-test', 'native-good'))
before_recipients = db.execute(f'SELECT {projection}, actor_id FROM transactions ORDER BY id').fetchall()
db.executescript((root / 'migrations/0020_native_recipients.sql').read_text())
assert db.execute(f'SELECT {projection}, actor_id FROM transactions ORDER BY id').fetchall() == before_recipients
assert db.execute('SELECT count(*) FROM transactions WHERE recipient_id IS NOT NULL OR memo IS NOT NULL').fetchone()[0] == 0
db.execute("UPDATE transactions SET recipient_id = 'recipient', memo = 'note' WHERE tx_reference = 'native-good'")
rejects("UPDATE transactions SET recipient_id = 'recipient' WHERE tx_reference = 'verified'")
rejects("UPDATE transactions SET memo = ? WHERE tx_reference = 'native-good'", ('x' * 501,))
assert db.execute('PRAGMA foreign_key_check').fetchall() == []
print('PASS: legacy rows/statuses, AUTOINCREMENT watermark, verified-payment inserts, native constraints, recipient upgrade and foreign keys preserved.')
