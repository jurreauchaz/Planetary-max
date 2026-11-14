import React, { useState } from 'react';
import { PortalThreeCanvas } from '../components/PortalThreeCanvas';

type MatchStatus = 'escrow-pending' | 'active' | 'completed';

const styles = `
.max-chess-arena{width:min(100% - 2rem,64rem);margin:2rem auto;overflow:hidden;border:1px solid rgba(245,158,11,.4);border-radius:1rem;background:#020617;color:#e2e8f0;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 25px 60px #0008}
.max-chess-arena *{box-sizing:border-box}.max-chess-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1.5rem;border-bottom:1px solid rgba(245,158,11,.3);background:#0f172a}.max-chess-brand{display:flex;align-items:center;gap:.7rem;color:#fbbf24;font-size:11px;font-weight:700;letter-spacing:.08em}.max-chess-pulse{width:.7rem;height:.7rem;border-radius:50%;background:#f59e0b;box-shadow:0 0 12px #f59e0b}.max-chess-node{color:#94a3b8;font-size:11px}.max-chess-node strong{color:#fcd34d}
.max-chess-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(250px,1fr);gap:1.25rem;padding:1.5rem}.max-chess-board,.max-chess-panel{min-width:0;border:1px solid rgba(245,158,11,.3);border-radius:.75rem;background:rgba(15,23,42,.75)}.max-chess-board{display:flex;min-height:500px;flex-direction:column;padding:1rem}.max-chess-panel{display:flex;flex-direction:column;justify-content:space-between;gap:1rem;padding:1.1rem}.max-chess-board-heading,.max-chess-player-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem}.max-chess-board-heading{margin-bottom:.75rem;color:#fbbf24;font-weight:700}.max-chess-state{padding:.25rem .5rem;border:1px solid rgba(16,185,129,.3);border-radius:.35rem;background:#022c22;color:#6ee7b7;font-size:10px;font-weight:400}.max-chess-canvas{flex:1;min-height:350px;overflow:hidden;border:1px solid #1e293b;border-radius:.5rem}.max-chess-player-row{padding-top:.75rem;border-top:1px solid #1e293b;color:#94a3b8;font-size:10px}.max-chess-clock{color:#fbbf24;font-weight:700;white-space:nowrap}
.max-chess-panel h2{margin:0 0 .4rem;color:#fbbf24;font-size:14px}.max-chess-panel p{margin:.5rem 0 1rem;color:#94a3b8;font-size:11px;line-height:1.6}.max-chess-form{display:grid;gap:.75rem}.max-chess-form label{display:block;margin-bottom:.35rem;color:#94a3b8;font-size:10px}.max-chess-form input{width:100%;padding:.65rem .75rem;border:1px solid #334155;border-radius:.4rem;background:#020617;color:#fcd34d;font:700 12px ui-monospace,monospace}.max-chess-info,.max-chess-notice{padding:.75rem;border:1px solid #1e293b;border-radius:.45rem;background:#020617;color:#94a3b8;font-size:10px;line-height:1.65}.max-chess-notice{border-color:rgba(245,158,11,.25);background:#1c1917;color:#fcd34d}.max-chess-button{width:100%;padding:.7rem;border:0;border-radius:.4rem;background:#d97706;color:white;font:700 11px ui-monospace,monospace;cursor:pointer}.max-chess-button:hover{background:#f59e0b}.max-chess-button:disabled{cursor:not-allowed;opacity:.5}.max-chess-ledger{height:14rem;overflow:auto;padding:.75rem;border:1px solid #1e293b;border-radius:.5rem;background:#020617;color:#cbd5e1;font-size:10px;line-height:1.9}.max-chess-ledger .muted{color:#64748b}.max-chess-ledger .waiting{color:#fbbf24}.max-chess-end{background:#be123c}.max-chess-end:hover{background:#e11d48}.max-chess-footer{padding-top:.75rem;border-top:1px solid #1e293b;color:#64748b;text-align:center;font-size:9px}
@media(max-width:760px){.max-chess-arena{width:calc(100% - 1rem);margin:.5rem auto}.max-chess-layout{grid-template-columns:1fr;padding:1rem}.max-chess-board{min-height:440px}.max-chess-header{align-items:flex-start;flex-direction:column}.max-chess-player-row{flex-wrap:wrap}}
`;

export const MaxChessArenaPage: React.FC = () => {
  const [stakeAmount, setStakeAmount] = useState('0.1');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStatus, setGameStatus] = useState<MatchStatus>('escrow-pending');

  const handleStartDemoMatch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGameStatus('active');
    setGameStarted(true);
  };

  const handleEndDemoMatch = () => {
    setGameStatus('completed');
    setGameStarted(false);
  };

  const handleReset = () => {
    setGameStatus('escrow-pending');
    setGameStarted(false);
  };

  return (
    <section className="max-chess-arena" aria-label="MAX Chess demo arena">
      <style>{styles}</style>
      <header className="max-chess-header">
        <div className="max-chess-brand"><span className="max-chess-pulse" aria-hidden="true" />MAX CHESS // DISTRACTION-FREE ARENA</div>
        <div className="max-chess-node">Node Protocol: <strong>max://chess.node</strong></div>
      </header>

      <div className="max-chess-layout">
        <section className="max-chess-board" aria-label="Chess board viewport">
          <div className="max-chess-board-heading">
            <span>3D Spatial Calculation View</span>
            <span className="max-chess-state">{gameStarted ? 'Demo Match Live' : gameStatus === 'completed' ? 'Demo Match Complete' : 'Awaiting Demo Match'}</span>
          </div>
          <div className="max-chess-canvas"><PortalThreeCanvas moduleType="chess" /></div>
          <div className="max-chess-player-row">
            <span>White: MaxJ (Rating: 2140)</span>
            <span>Black: Grandmaster Bot</span>
            <span className="max-chess-clock">Clock: 05:00</span>
          </div>
        </section>

        <aside className="max-chess-panel" aria-label="Match and stake controls">
          {!gameStarted ? (
            <div>
              <h2>{gameStatus === 'completed' ? 'Demo Match Complete' : 'Stake & Escrow Setup'}</h2>
              <p>Set a display amount and start a local demo match. No stake is submitted or held.</p>
              <form className="max-chess-form" onSubmit={handleStartDemoMatch}>
                <div>
                  <label htmlFor="demo-stake-amount">Demo stake amount (ETH display only)</label>
                  <input id="demo-stake-amount" type="number" min="0.000001" step="any" value={stakeAmount} onChange={(event) => setStakeAmount(event.target.value)} required />
                </div>
                <div className="max-chess-info">
                  <div>Escrow status: <strong style={{ color: '#fbbf24' }}>Not connected</strong></div>
                  <div>Match: <strong style={{ color: '#6ee7b7' }}>Local demo only</strong></div>
                </div>
                <div className="max-chess-notice" role="note">Demo interface only — no wallet, payment, D1 escrow, or payout is connected. Do not enter or send funds.</div>
                <button className="max-chess-button" type="submit" disabled={!Number.isFinite(Number(stakeAmount)) || Number(stakeAmount) <= 0}>Start Demo Match</button>
                {gameStatus === 'completed' && <button className="max-chess-button" type="button" onClick={handleReset}>Reset Match</button>}
              </form>
            </div>
          ) : (
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', marginBottom: '.75rem' }}>
                  <h2>Demo Match Ledger</h2><strong style={{ color: '#6ee7b7', fontSize: '10px' }}>Display: {stakeAmount} ETH</strong>
                </div>
                <div className="max-chess-ledger" aria-label="Demo PGN move history">
                  <div className="muted">// PGN Move Log · Demo</div>
                  <div>1. e4 c5</div>
                  <div>2. c3 d5</div>
                  <div>3. exd5 Qxd5</div>
                  <div>4. d4 Nf6</div>
                  <div>5. Nf3 e6</div>
                  <div className="waiting">&gt; Waiting for White move...</div>
                </div>
              </div>
              <button type="button" className="max-chess-button max-chess-end" onClick={handleEndDemoMatch}>End Demo Match</button>
            </div>
          )}
          <div className="max-chess-footer">Local demo · No funds move · Escrow and payouts are not implemented</div>
        </aside>
      </div>
    </section>
  );
};

export default MaxChessArenaPage;
