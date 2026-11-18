<!-- coderabbit-ai-generated:v1 -->

# MAX SPORTS integration points

The #/sports workspace now has Sportsbook, P2P Stakes and Predictive Suite views. This change adds the interface and read adapters; it does not enable placing wagers, funding stakes, matching peers or settling outcomes.

## Connect your code

- `src/modules/sports/sportsIntegration.ts`: implement `sportsDataSource.markets(signal)` and `.challenges(signal)` using your server APIs. The types describe the expected data. Return `null` when disconnected, an empty array when connected with no records, or reject when the request fails. Pass the AbortSignal to fetch and validate server responses before returning typed records.
- `src/modules/sports/SportsSuite.tsx`: market selection and stake amount create a local wager-slip preview. The P2P form previews a challenge locally; leaving the view clears it. Execution buttons remain disabled. Add execution handlers only after implementing authenticated, server-validated funding, market/quote checks, matching, reservation and settlement in your service. Connecting read data alone does not enable execution.
- `src/modules/sports/SportsPredictiveView.tsx`: keeps existing published research at `/v1/dat/sports/list`, league filters and detail selection inside the Predictive Suite view. Published picks and reported confidence remain author-entered research. This update adds no prediction engine or live sports provider.
- `src/modules/sports/sports-suite.css`: responsive suite styling follows the existing Portal palette.

No new endpoints, migrations, dependencies, provider credentials or fake market records are included. Open `/#/sports` after building/deploying to see the workspace. Markets display only the records returned by your implementation. Peer challenges expose open/matched/settled filters for your service data. Stake currencies are draft labels until your backend implements their rules.
