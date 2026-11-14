export function renderCommandConsole(environment: string): string {
  const safeEnvironment = environment.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PORTAL-OS</title><body><main><h1>MAX SPACE — PORTAL-OS</h1><p>Environment: ${safeEnvironment}</p><p>API ledger scaffold. No funds are transferred by this interface.</p></main></body></html>`;
}
