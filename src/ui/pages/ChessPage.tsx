import React from 'react';

export default function ChessPage() {
  return (
    <main style={{ padding: '2rem', background: '#0a0a0c', color: '#f0f0f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #222', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 300, letterSpacing: '2px' }}>MAX CHESS (MC-001)</h1>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>3D Spatial Board &amp; Verified PGN Tournament Engine</p>
      </header>
      <section aria-label="Chess arena preview" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px', background: '#121216', border: '1px solid #222', borderRadius: '12px' }}>
        <div style={{ textAlign: 'center' }}>
          <div aria-hidden="true" style={{ fontSize: '3rem', marginBottom: '1rem' }}>♟️ ♞ ♝ ♜ ♛ ♚</div>
          <p style={{ color: '#aaa' }}>React Three Fiber 3D Canvas Mounting...</p>
        </div>
      </section>
    </main>
  );
}
