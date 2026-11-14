export class SovereignSdkClient {
  constructor(private readonly baseUrl: string, private readonly fetcher: typeof fetch = fetch) {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') throw new Error('SDK base URL must use HTTPS');
  }
  async getDat(datId: string): Promise<unknown> {
    const response = await this.fetcher(new URL(`/v1/dat/${encodeURIComponent(datId)}`, this.baseUrl));
    if (!response.ok) throw new Error(`DAT lookup failed (${response.status})`);
    return response.json();
  }
}
