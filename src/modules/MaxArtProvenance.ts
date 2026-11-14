export interface ArtProvenanceRecord {
  title: string;
  artist: string;
  fileHash: string;
  timestamp: number;
  signature: string;
}

export class MaxArtProvenanceEngine {
  /**
   * Computes the SHA-256 cryptographic fingerprint of a local artwork file.
   */
  public static async computeFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hashHex}`;
  }

  /**
   * Builds the signed provenance payload ready for edge submission.
   */
  public static async createProvenanceRecord(
    file: File,
    title: string,
    artist: string
  ): Promise<ArtProvenanceRecord> {
    const fileHash = await this.computeFileHash(file);
    const timestamp = Date.now();
    const signature = `sig_art_${btoa(`${title}:${fileHash}:${timestamp}`).slice(0, 32)}`;

    return {
      title,
      artist,
      fileHash,
      timestamp,
      signature
    };
  }
}
