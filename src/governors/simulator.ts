export type GrowthMode = 'linear' | 'exponential' | 'double-exponential' | 'tetration';
// A bounded mathematical scenario, not a forecast of deployed compute capacity.
export function growthModel(base: number, height: number, mode: GrowthMode): number | null {
  if (!Number.isInteger(base) || base < 2 || base > 10 || !Number.isInteger(height) || height < 1 || height > 5) throw new Error('Use a base from 2 to 10 and a height from 1 to 5.');
  let value: number;
  if (mode === 'linear') value = base * height;
  else if (mode === 'exponential') value = base ** height;
  else if (mode === 'double-exponential') value = base ** (base ** height);
  else if (mode === 'tetration') { value = base; for (let i = 1; i < height; i++) { if (value > Math.log(Number.MAX_SAFE_INTEGER) / Math.log(base)) return null; value = base ** value; } }
  else throw new Error('Unknown growth model.');
  return Number.isSafeInteger(value) ? value : null;
}
