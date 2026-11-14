export interface ChessMetadata { pgnHash: string; moveCount: number; result: '1-0' | '0-1' | '1/2-1/2' | '*' }
export function validateChessMetadata(value: unknown): value is ChessMetadata {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return typeof data.pgnHash === 'string' && /^[a-f0-9]{32,128}$/i.test(data.pgnHash) &&
    Number.isSafeInteger(data.moveCount) && (data.moveCount as number) >= 0 &&
    ['1-0', '0-1', '1/2-1/2', '*'].includes(String(data.result));
}
