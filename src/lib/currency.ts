/**
 * Format number to Indonesian Rupiah (IDR)
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Parse IDR string back to number
 */
export function parseIDR(idrString: string): number {
  // Remove currency symbol and dots, then parse
  const cleanString = idrString.replace(/[^\d]/g, '')
  return parseInt(cleanString) || 0
}

/**
 * Convert USD to IDR (approximate rate)
 */
export function usdToIdr(usdAmount: number): number {
  const exchangeRate = 15000 // 1 USD = 15,000 IDR (approximate)
  return Math.round(usdAmount * exchangeRate)
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return formatIDR(price)
}
