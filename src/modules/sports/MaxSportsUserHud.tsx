import React, { useState } from 'react';
import { OUTPUT_TIERS, type OutputTierOption } from '../../shared/outputTiers';

/** Output-tier preview. This UI does not create an order or initiate a payment. */
export default function MaxSportsUserHud() {
  const [selectedTierId, setSelectedTierId] = useState(OUTPUT_TIERS[0].id);
  const [optInWallet, setOptInWallet] = useState(false);
  const [statusLines, setStatusLines] = useState<string[]>([
    'Public MAX-INTERNET browsing is free. Wallet-free research mode is active.',
    'Outputs only — internal modules and the BEEMAX operator console are not exposed here.',
  ]);
  const activeTier = OUTPUT_TIERS.find((tier) => tier.id === selectedTierId) ?? OUTPUT_TIERS[0];

  function pushLog(message: string) {
    setStatusLines((previous) => [...previous.slice(-29), message]);
  }

  return (
    <section className="module-view max-sports-output" aria-label="MAX-SPORTS Highlights, Research & Outputs">
      <header>
        <p>Rail: <strong>Base USDC (Chain 8453)</strong> | Mode: <strong>{optInWallet ? 'Wallet Opt-In Enabled' : 'Wallet-Free Research'}</strong></p>
        <h1>MAX-SPORTS Highlights, Research & Outputs</h1>
        <p>Preview research tiers. No wallet connection, payment, or order is performed here.</p>
        <button type="button" aria-pressed={optInWallet} onClick={() => {
          const next = !optInWallet;
          setOptInWallet(next);
          pushLog(next ? 'Opt-in wallet mode toggled ON. No signing or transaction is initiated by this preview.' : 'Wallet-free research mode active.');
        }}>
          {optInWallet ? 'Return to Wallet-Free Mode' : 'Opt-In Wallet (Optional)'}
        </button>
      </header>

      <div>
        <h2>Select a tier & inspect the details</h2>
        {OUTPUT_TIERS.map((tier) => (
          <button key={tier.id} type="button" aria-pressed={selectedTierId === tier.id} onClick={() => setSelectedTierId(tier.id)}>
            {tier.tierLabel} — {tier.priceUsdc} USDC
          </button>
        ))}
        <article>
          <h3>{activeTier.outputTitle}</h3>
          <p><strong>Tier price:</strong> {activeTier.priceUsdc} USDC | <strong>Reinvestment tag:</strong> <code>{activeTier.reinvestTarget}</code></p>
          <p><strong>Highlights:</strong> {activeTier.highlightSummary}</p>
          <p><strong>Research & output scope:</strong> {activeTier.researchNote}</p>
          <p><strong>Risk & escrow visibility:</strong> {activeTier.riskDisclosure}</p>
          <button type="button" onClick={() => {
            if (activeTier.priceUsdc === '0.000000') {
              pushLog(`Free output preview selected: "${activeTier.outputTitle}" (0.000000 USDC, wallet-free).`);
            } else if (!optInWallet) {
              pushLog(`Preview only: "${activeTier.outputTitle}" (${activeTier.priceUsdc} USDC). Opt-in mode is required before any future payment flow.`);
            } else {
              pushLog(`Preview only: "${activeTier.outputTitle}" (${activeTier.priceUsdc} USDC) -> ${activeTier.reinvestTarget}. No order or transaction was created.`);
            }
          }}>
            {activeTier.priceUsdc === '0.000000' ? 'Access Free Output Preview' : optInWallet ? `Preview ${activeTier.priceUsdc} USDC Output` : `Preview ${activeTier.priceUsdc} USDC Output`}
          </button>
        </article>
      </div>

      <section aria-label="Activity and research feed">
        <h2>Activity & Research Feed</h2>
        <pre>{statusLines.join('\n')}</pre>
      </section>
    </section>
  );
}
