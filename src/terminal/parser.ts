// Commands map to fixed read-only endpoints. Never evaluate terminal input as code.
const routes: Record<string, string> = {
  status: '/api/status', 'sys:status': '/api/status',
  'd1 art list': '/api/artworks', 'd1 chess list': '/v1/dat/chess/list',
  'd1 sports list': '/v1/dat/sports/list', 'registry list': '/api/admin/nodes',
  'ont:domains': '/api/admin/runtime', 'agent:list': '/api/admin/beemax/config',
  'gov:policy': '/api/admin/runtime', 'catalog list': '/api/admin/catalog',
};
export function parseCommand(input: string): { kind: 'clear' | 'help' | 'unknown' } | { kind: 'request'; path: string } {
  const command = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (command === 'clear' || command === 'help') return { kind: command };
  return routes[command] ? { kind: 'request', path: routes[command] } : { kind: 'unknown' };
}
export const commandHelp = `help · clear · ${Object.keys(routes).join(' · ')}`;
