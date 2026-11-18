/** Bind collector access to the paying wallet, artwork, receipt, and site origin. */
export function checkoutMessage(origin: string, artworkId: string, txHash: string, buyerAddress: string) {
  return `Planetary-Max collector access\nOrigin: ${origin}\nArtwork: ${artworkId}\nTransaction: ${txHash.toLowerCase()}\nBuyer: ${buyerAddress.toLowerCase()}`;
}
