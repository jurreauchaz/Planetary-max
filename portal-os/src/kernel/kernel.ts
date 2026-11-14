export interface CapabilityContext {
  requestId: string;
  identityId: string;
  capabilities: ReadonlySet<string>;
}

export type SovereignHandler<T = unknown> = (input: unknown, context: CapabilityContext) => Promise<T>;

export class SovereignKernel {
  private readonly handlers = new Map<string, SovereignHandler>();

  register(name: string, requiredCapability: string, handler: SovereignHandler): void {
    if (!/^[a-z][a-z0-9._-]{1,63}$/.test(name) || this.handlers.has(name)) throw new Error('Invalid or duplicate kernel function');
    this.handlers.set(name, async (input, context) => {
      if (!context.capabilities.has(requiredCapability)) throw new Error('Capability denied');
      return handler(input, context);
    });
  }

  async dispatch(name: string, input: unknown, context: CapabilityContext): Promise<unknown> {
    const handler = this.handlers.get(name);
    if (!handler) throw new Error('Unknown sovereign function');
    return handler(input, context);
  }
}
