export type DomainName = 'MAX_ART' | 'MAX_CHESS' | 'MAX_SPORT';
export interface DomainModule { readonly domain: DomainName; validate(payload: unknown): boolean }

export class DomainModuleRegistry {
  private readonly modules = new Map<DomainName, DomainModule>();
  register(module: DomainModule): void {
    if (this.modules.has(module.domain)) throw new Error(`Domain already registered: ${module.domain}`);
    this.modules.set(module.domain, module);
  }
  get(domain: DomainName): DomainModule | undefined { return this.modules.get(domain); }
}
