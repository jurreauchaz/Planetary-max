/** Algorithms are explicitly unavailable until a reviewed implementation is installed. */
export const algorithmRegistry = Object.freeze({
  'ML-KEM': { available: false, note: 'Not implemented in this scaffold' },
  'ML-DSA': { available: false, note: 'Not implemented in this scaffold' },
  'Ed25519': { available: true, note: 'WebCrypto provider support must be verified at runtime' },
});

export function isAlgorithmAvailable(name: keyof typeof algorithmRegistry): boolean {
  return algorithmRegistry[name].available;
}
