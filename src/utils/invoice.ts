export function generateInvoiceNumber(prefix: string, nextNumber: number): string {
  const padded = String(nextNumber).padStart(6, '0')
  return `${prefix}-${padded}`
}

export function incrementInvoiceNumber(currentNumber: string): string {
  const parts = currentNumber.split('-')
  if (parts.length !== 2) return currentNumber
  const num = parseInt(parts[1], 10)
  if (isNaN(num)) return currentNumber
  return `${parts[0]}-${String(num + 1).padStart(6, '0')}`
}

export function parseInvoiceNumber(invoiceNumber: string): { prefix: string; number: number } | null {
  const parts = invoiceNumber.split('-')
  if (parts.length !== 2) return null
  const num = parseInt(parts[1], 10)
  if (isNaN(num)) return null
  return { prefix: parts[0], number: num }
}
