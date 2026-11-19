import React, { useState } from 'react';

interface OutputTierOption {
  id: string;
  tierLabel: string;
  priceUsdc: string;
  outputTitle: string;
  highlightSummary: string;
  researchNote: string;
  riskDisclosure: string;
  reinvestTarget: string;
}

const OUTPUT_TIERS: OutputTierOption[] = [
  {
    id: 'tier_free_0',
    tierLabel: 'Free Observation & Preview',
    priceUsdc: '0.000000',
    outputTitle: 'Highlight Clip & Research Abstract (Free Output)',
    highlightSummary: 'Free public MAX-INTERNET highlight & matchup overview.',
    researchNote: 'Introductory sports & research preview; no wallet or payment required.',
    riskDisclosure: '0.000000 USDC risked in preview mode; escrow state = untouched.',
    reinvestTarget: 'MAX-SPORTS',
  },
  {
    id: 'tier_std_5',
    tierLabel: 'Standard Output Tier',
    priceUsdc: '5.000000',
    outputTitle: 'Match Highlight & Research Output Brief',
    highlightSummary: 'Key tactical moments, tempo markers, and highlight breakdown.',
    researchNote: 'Structured research output only — underlying modules remain internal.',
    riskDisclosure: 'Explicit opt-in Base USDC (8453) action required only if paying for output.',
    reinvestTarget: 'MAX-COMPUTE',
  },
  {
    id: 'tier_ext_15',
    tierLabel: 'Extended Output Tier',
    priceUsdc: '15.000000',
    outputTitle: 'Full Sports Prediction & Cross-Output Research Pack',
    highlightSummary: 'Extended highlight timeline, risk/escrow breakdown, and research report.',
    researchNote: 'Delivers output report only; no raw modules or BEEMAX console access.',
    riskDisclosure: 'Review risk & escrow terms before opting in to Base USDC signing.',
    reinvestTarget: 'MAX-ECOSYSTEM',
  },
];

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
