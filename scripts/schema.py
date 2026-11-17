#!/usr/bin/env python3
"""Generate/check the unified D1 bootstrap against its append-only upgrade history."""
import argparse
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def migrated():
    db = sqlite3.connect(':memory:')
    db.execute('PRAGMA foreign_keys = ON')
    for path in sorted((ROOT / 'migrations').glob('*.sql')):
        db.executescript(path.read_text())
    return db


def seed_statements(db):
    # Export final seed state, rather than replaying historical UPDATEs that
    # could overwrite newer seed metadata on a repeated bootstrap.
    for kind, table, _ in schema_objects(db):
        if kind != 'table':
            continue
        columns = [row for row in db.execute(f'PRAGMA table_xinfo("{table}")') if row[6] == 0]
        names = ', '.join(f'"{row[1]}"' for row in columns)
        for record in db.execute(f'SELECT {names} FROM "{table}" ORDER BY rowid').fetchall():
            values = []
            for column, value in zip(columns, record):
                if column[1] in ('created_at', 'updated_at') and value is not None and value != '2024-03-09T16:00:00.000Z':
                    expression = "(unixepoch() * 1000)" if column[2] == 'INTEGER' else "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"
                    values.append(expression)
                else:
                    values.append(db.execute('SELECT quote(?)', (value,)).fetchone()[0])
            yield f'INSERT OR IGNORE INTO "{table}" ({names}) VALUES ({", ".join(values)});'


def schema_objects(db):
    return db.execute("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name != 'd1_migrations' ORDER BY rowid").fetchall()


def snapshot(db, seeds):
    parts = [
        '-- Planetary-max / Portal-OS1 unified Cloudflare D1 schema.',
        '-- Canonical bootstrap for an EMPTY database, including sample catalog/telemetry.',
        '-- Existing databases must use Wrangler migrations; CREATE IF NOT EXISTS does not upgrade tables.',
        '-- Regenerate: python3 scripts/schema.py --write; verify: npm run db:check.',
        '-- Includes Wrangler migration receipts so future upgrades skip this baseline.',
        '-- Text IDs, roles, amounts in cents, payment fields and constraints match deployed APIs.',
        'PRAGMA foreign_keys = ON;',
    ]
    for kind, _, sql in schema_objects(db):
        sql = re.sub(r'^CREATE (TABLE|INDEX|UNIQUE INDEX) (?!IF NOT EXISTS)', r'CREATE \1 IF NOT EXISTS ', sql)
        parts.append(sql + ';')
    parts.append('-- Sample records. Artist accounts have no usable login password. Revenue metrics are not confirmed earnings.')
    parts.extend(seeds)
    parts.append('-- Wrangler baseline receipts: only valid when importing into an EMPTY database.')
    parts.append('CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);')
    for migration in sorted((ROOT / 'migrations').glob('*.sql')):
        name = migration.name.replace("'", "''")
        parts.append(f"INSERT OR IGNORE INTO d1_migrations (name) VALUES ('{name}');")
    return '\n\n'.join(parts) + '\n'


def normalized_schema(db):
    return sorted((kind, name, re.sub(r'\s+', ' ', re.sub(r'\bIF NOT EXISTS\s+', '', sql)).strip()) for kind, name, sql in schema_objects(db))


def seed_state(db):
    result = {}
    for kind, table, _ in schema_objects(db):
        if kind != 'table':
            continue
        # Automatic timestamps differ between independently initialized databases.
        columns = [row[1] for row in db.execute(f'PRAGMA table_xinfo("{table}")') if row[1] not in ('created_at', 'updated_at')]
        projection = ', '.join(f'"{column}"' for column in columns)
        result[table] = sorted(map(repr, db.execute(f'SELECT {projection} FROM "{table}"').fetchall()))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Replace schema.sql from verified migration history')
    args = parser.parse_args()
    history = migrated()
    seeds = list(seed_statements(history))
    canonical = snapshot(history, seeds)
    path = ROOT / 'schema.sql'
    if args.write:
        path.write_text(canonical)
    assert path.read_text() == canonical, 'schema.sql drifted; run python3 scripts/schema.py --write'
    boot = sqlite3.connect(':memory:')
    boot.executescript(canonical)
    assert normalized_schema(history) == normalized_schema(boot), 'Schema/constraint/index mismatch'
    assert seed_state(history) == seed_state(boot), 'Seed data mismatch'
    assert boot.execute('SELECT name FROM d1_migrations ORDER BY name').fetchall() == [(p.name,) for p in sorted((ROOT / 'migrations').glob('*.sql'))], 'Invalid baseline receipts'
    before = seed_state(boot)
    boot.executescript(canonical)
    assert seed_state(boot) == before, 'Bootstrap is not repeatable'
    assert not boot.execute('PRAGMA foreign_key_check').fetchall(), 'Foreign key violation'
    # Exercise SQL boundaries used by the gallery, chess and verified-payment handlers.
    boot.execute('SELECT u.username, a.fulfillment_uri, a.access_token, ap.bio FROM artworks a JOIN users u ON u.id=a.artist_id LEFT JOIN artist_profiles ap ON ap.user_id=u.id').fetchall()
    boot.execute("INSERT INTO chess_games(game_id, white_player, black_player, fen) VALUES ('schema-check', 'White', 'Black', 'test-fen')")
    boot.execute("INSERT INTO transactions(artwork_id, item_id, buyer_email, tx_reference, amount, currency, status, created_at) VALUES ('art_001', 'art_001', 'check@example.test', 'schema-check', 1800, 'DAT', 'pending', 0)")
    assert boot.execute("SELECT item_id, amount, status FROM transactions WHERE tx_reference='schema-check'").fetchone() == ('art_001', 1800, 'pending')
    boot.execute('SELECT identity_id, handle FROM sovereign_identities').fetchall()
    print(f'PASS: {len(seed_state(history))} tables; canonical schema, indexes, constraints, seeds, repeatability, foreign keys and API columns match migration history.')


if __name__ == '__main__':
    main()
