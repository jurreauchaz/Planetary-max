import { afterEach, describe, expect, it, vi } from 'vitest';
import { Group } from 'three';
import { applyMaxQgaDistortion, logMaxQgaDistortion } from './maxQga';
afterEach(() => vi.unstubAllGlobals());
describe('MAX-QGA visual transform', () => {
  it('scales all piece axes without accumulation and resets to identity', () => {
    const group = new Group();
    group.position.set(2, 0, 3);
    applyMaxQgaDistortion(group, 1);
    expect(group.scale.toArray()).toEqual([1.15, 0.92, 1.15]);
    applyMaxQgaDistortion(group, 1);
    expect(group.scale.toArray()).toEqual([1.15, 0.92, 1.15]);
    applyMaxQgaDistortion(group, 0);
    expect(group.scale.toArray()).toEqual([1, 1, 1]);
    expect(group.position.toArray()).toEqual([2, 0, 3]);
  });
  it.each([NaN, Infinity, -1, 2])('rejects invalid factor %s', factor => {
    expect(() => applyMaxQgaDistortion(new Group(), factor)).toThrow();
  });
  it('uses the NLP query contract and exposes telemetry failures', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetch);
    await logMaxQgaDistortion(0.5);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ query: 'MAX-QGA visual distortion applied with factor 0.5' });
    fetch.mockResolvedValue({ ok: false });
    await expect(logMaxQgaDistortion(0.5)).rejects.toThrow('telemetry');
    await expect(logMaxQgaDistortion(-1)).rejects.toThrow('Invalid');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
