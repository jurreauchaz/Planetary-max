import React, { useState } from 'react';

const leagues = ['NFL', 'NBA', 'MLB', 'SOCCER', 'MMA'];

export default function SportsPage() {
  const [activeLeague, setActiveLeague] = useState('NFL');

  return (
    <div style={{ padding: '2rem', background: '#0a0a0c', color: '#f0f0f5', minHeight: '100%', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #222', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 300, letterSpacing: '2px' }}>MAX SPORTS HUD</h1>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Oracle Telemetry &amp; Predictive NIL Analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} aria-label="Select league">
          {leagues.map((league) => (
            <button
              key={league}
              type="button"
              aria-pressed={activeLeague === league}
              onClick={() => setActiveLeague(league)}
              style={{ background: activeLeague === league ? '#3b82f6' : '#1a1a22', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              {league}
            </button>
          ))}
        </div>
      </header>
      <section aria-live="polite" style={{ background: '#121216', border: '1px solid #222', padding: '2rem', borderRadius: '8px' }}>
        <h2>Active League Feed: {activeLeague}</h2>
        <p style={{ color: '#888', marginTop: '0.5rem' }}>Listening to decentralized oracle consensus feeds and cryptographic match state verifications...</p>
      </section>
    </div>
  );
}
