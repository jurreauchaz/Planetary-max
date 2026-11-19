INSERT OR IGNORE INTO sovereign_policy_log (policy_id, scope, policy_key, policy_value, notes) VALUES
  ('pol_wallet_free', 'MAX-SOVEREIGN', 'wallet_mode', 'opt-in', 'Operate wallet-free by default until on-chain/treasury action is requested'),
  ('pol_max_internet', 'MAX-SOVEREIGN', 'public_max_internet_free', 'true', 'Public MAX-INTERNET pages remain free to browse'),
  ('pol_rails', 'MAX-SOVEREIGN', 'excluded_rails', 'R2,STRIPE,BITCOIN', 'Strictly excluded from stack and economic architecture');

INSERT OR IGNORE INTO arena_feeds (item_id, domain, title, status, summary, formula_or_meta) VALUES
  ('sp_01', 'sports', 'MAX-SPORTS Telemetry Room #01', 'live_telemetry', 'Edge match room tracking pace, momentum index, and non-custodial market state.', 'Room: SP-01 | Rail: Base USDC Escrow (Opt-In) | Reinvest Tag: MAX-SPORTS'),
  ('sp_02', 'sports', 'MAX-SPORTS Prediction Pool #02', 'open_observation', 'Pre-settlement prediction market with ledger status tracked in D1/DO.', 'Pool: SP-02 | Status: Untouched / Deferred Settlement'),
  ('ch_01', 'chess', 'MAX Chess 3D Arena — Distortion Lab', 'active_match', 'Asymmetric opening evaluation and clock-pressure telemetry stream.', 'Arena: MC-001 | Engine: Telemetry & Move Log | Reinvest Tag: MAX-CHESS'),
  ('ch_02', 'chess', 'MAX Chess 3D Arena — Endgame Study', 'queued', 'Position evaluation and structural asymmetry review room.', 'Study: EG-04 | Mode: Wallet-Free Spectator & Analysis'),
  ('mm_01', 'max_math', 'MAX MATH — Eigen-Perturbation & Projection', 'feed_ready', 'Linear projection and subspace stability notes synced from private www feed.', 'f(x) = P x + ε Δx, ||P² − P|| = 0'),
  ('mp_01', 'max_physics', 'MAX PHYSICS — Wave Dispersion & Field Flux', 'feed_ready', 'Dispersion relation and flux conservation notes synced from private www feed.', 'ω(k) = c√(k² + m²), ∇·J + ∂ρ/∂t = 0');
