export interface GstBreakdown {
  taxable: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  totalAmount: number
}

export interface GstSettings {
  gstin: string
  businessName: string
  businessAddress: string
  businessState: string
  stateCode: string
  defaultGstRate: string
  invoicePrefix: string
  invoiceNextNumber: string
}

export function calculateGst(
  totalAmount: number,
  gstRate: number,
  isInterState: boolean,
  isPreTax: boolean = false
): GstBreakdown {
  let taxable: number
  let tax: number

  if (isPreTax) {
    // totalAmount is pre-GST, calculate tax on top
    taxable = Math.round(totalAmount * 100) / 100
    tax = Math.round((totalAmount * gstRate / 100) * 100) / 100
    totalAmount = Math.round((totalAmount + tax) * 100) / 100
  } else {
    // totalAmount is GST-inclusive, extract pre-tax
    const divisor = 1 + gstRate / 100
    taxable = Math.round((totalAmount / divisor) * 100) / 100
    tax = Math.round((totalAmount - taxable) * 100) / 100
  }

  if (isInterState) {
    return {
      taxable,
      cgst: 0,
      sgst: 0,
      igst: tax,
      totalTax: tax,
      totalAmount,
    }
  }

  const halfTax = Math.round((tax / 2) * 100) / 100
  return {
    taxable,
    cgst: halfTax,
    sgst: halfTax,
    igst: 0,
    totalTax: tax,
    totalAmount,
  }
}

export function formatGstRate(rate: number): string {
  return `${rate}%`
}

export function formatGstin(gstin: string): string {
  if (!gstin) return ''
  return gstin.replace(/(\d{2})([A-Z]{5})(\d{4})([A-Z]{1})(\d{1})([Z]{1})([A-Z0-9]{1})/, '$1 $2 $3 $4 $5 $6 $7')
}
