/** Replace these read adapters with your MAX SPORTS API calls. */
export interface SportsSelection {
  id: string;
  label: string;
  decimalOdds: number;
}
export interface SportsMarket {
  id: string;
  event: string;
  league: string;
  market: 'Moneyline' | 'Spread' | 'Totals';
  startsAt: string;
  selections: SportsSelection[];
}
export interface PeerChallenge {
  id: string;
  event: string;
  league: string;
  market: string;
  selection: string;
  stake: string;
  currency: string;
  status: 'open' | 'matched' | 'settled';
}
export interface SportsDataSource {
  /** null means no integration; [] means connected with no records. */
  markets(signal: AbortSignal): Promise<SportsMarket[] | null>;
  challenges(signal: AbortSignal): Promise<PeerChallenge[] | null>;
}
export const sportsDataSource: SportsDataSource = {
  async markets(_signal) { return null; },
  async challenges(_signal) { return null; },
};
// Funding, matching, placing wagers and settlement require your server code.
// Read adapters do not authorize or enable money actions.
