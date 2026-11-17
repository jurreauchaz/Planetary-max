import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ecosystem } from '../App';

afterEach(() => vi.unstubAllGlobals());

describe('ecosystem routes', () => {
  it.each([
    ['/', 'Sovereign'],
    ['/storefront', 'Sovereign'],
    ['/chess', 'Think beyond'],
    ['/sports', 'Performance'],
    ['/umbrella', 'Ideas under'],
    ['/beemax', 'A command center'],
    ['/overview', 'Everything in'],
    ['/unknown-space', 'SPACE NOT FOUND'],
  ])('renders %s inside the shared navigation and command stream', (path, title) => {
    vi.stubGlobal('navigator', { onLine: true });
    const html = renderToString(<MemoryRouter initialEntries={[path]}><Ecosystem /></MemoryRouter>);
    expect(html).toContain(title);
    expect(html).toContain('aria-label="Ecosystem spaces"');
    expect(html).toContain('id="command-stream"');
    for (const route of ['/storefront', '/chess', '/sports', '/umbrella', '/beemax']) {
      expect(html).toContain(`href="${route}"`);
    }
  });
});
