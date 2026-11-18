/** Bind collector access to the paying wallet, artwork, receipt, and site origin. */
export function checkoutMessage(origin: string, artworkId: string, txHash: string, buyerAddress: string) {
  return `Planetary-Max collector access\nOrigin: ${origin}\nArtwork: ${artworkId}\nTransaction: ${txHash.toLowerCase()}\nBuyer: ${buyerAddress.toLowerCase()}`;
}
/** Separate signing domain prevents artwork access signatures being used for releases. */
export function digitalCheckoutMessage(origin: string, productId: string, txHash: string, buyerAddress: string) {
  return `Planetary-Max digital collector access\nOrigin: ${origin}\nRelease: ${productId}\nTransaction: ${txHash.toLowerCase()}\nBuyer: ${buyerAddress.toLowerCase()}`;
}
