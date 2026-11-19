const COVER_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600" width="1200" height="1600" role="img" aria-label="Crown and Return - MaxJ - Jurreauism">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0B0D10" />
      <stop offset="55%" stop-color="#14181F" />
      <stop offset="100%" stop-color="#0B0D10" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F0D078" />
      <stop offset="50%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#8F6B19" />
    </linearGradient>
  </defs>

  <!-- Ground -->
  <rect width="1200" height="1600" fill="url(#bgGrad)" />

  <!-- Subtle Frame -->
  <rect x="64" y="64" width="1072" height="1472" fill="none" stroke="#D4AF37" stroke-opacity="0.28" stroke-width="2" />

  <!-- Geometric Crown Anchor -->
  <g transform="translate(240, 420)">
    <polygon
      points="360,40 500,250 680,90 620,380 100,380 40,90 220,250"
      fill="url(#goldGrad)"
    />
    <rect x="100" y="405" width="520" height="28" fill="#D4AF37" />
    <rect x="140" y="446" width="440" height="8" fill="#F4F6F8" fill-opacity="0.55" />
  </g>

  <!-- Title Hierarchy -->
  <text
    x="600"
    y="1040"
    text-anchor="middle"
    fill="#F4F6F8"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="76"
    letter-spacing="10"
  >CROWN AND RETURN</text>

  <!-- Signature & Jurreauism Mark -->
  <text
    x="600"
    y="1120"
    text-anchor="middle"
    fill="#D4AF37"
    font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    font-size="24"
    letter-spacing="6"
  >MaxJ  //  JURREAUISM  //  DAT-JURREAUISM-v1</text>
</svg>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (url.pathname === "/" || url.pathname === "/crown-and-return.svg") {
      return new Response(COVER_SVG, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
