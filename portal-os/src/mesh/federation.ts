export interface FederationTarget { name: string; binding: Fetcher }

/** Dispatches only to explicitly configured service bindings; URLs are not caller-controlled. */
export function createFederationRouter(targets: readonly FederationTarget[]) {
  const byName = new Map(targets.map((target) => [target.name, target.binding]));
  return async (name: string, request: Request): Promise<Response> => {
    const target = byName.get(name);
    if (!target) return Response.json({ error: 'Unknown federation target' }, { status: 404 });
    return target.fetch(request);
  };
}
