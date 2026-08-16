'use client'

import { useState, useRef } from 'react'
import { formatDateTime } from '@/utils'
import { escapeHtml } from '@/utils/escape-html'

interface ReceiptItem {
  name: string
  sku: string
  hsnCode?: string
  quantity: number
  unitPrice: number
  discount: number
  totalAmount: number
  gstRate?: number
}

interface ReceiptProps {
  invoiceNumber: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  cgst: number
  sgst: number
  igst: number
  totalAmount: number
  paymentMethod: string
  customerName?: string
  customerPhone?: string
  businessName?: string
  businessAddress?: string
  businessGstin?: string
  businessState?: string
  businessStateCode?: string
  date?: string
  onClose?: () => void
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertHundreds = (n: number): string => {
    let result = ''
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' '
      n %= 10
    }
    if (n > 0) {
      result += ones[n] + ' '
    }
    return result.trim()
  }

  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)

  let result = ''
  const crore = Math.floor(rupees / 10000000)
  const lakh = Math.floor((rupees % 10000000) / 100000)
  const thousand = Math.floor((rupees % 100000) / 1000)
  const remaining = rupees % 1000

  if (crore > 0) result += convertHundreds(crore) + 'Crore '
  if (lakh > 0) result += convertHundreds(lakh) + 'Lakh '
  if (thousand > 0) result += convertHundreds(thousand) + 'Thousand '
  if (remaining > 0) result += convertHundreds(remaining) + ' '

  result = result.trim() + ' Rupees'
  if (paise > 0) {
    result += ' and ' + convertHundreds(paise) + ' Paise'
  }
  result += ' Only'
  return result
}

export default function Receipt({
  invoiceNumber,
  items,
  subtotal,
  discount,
  cgst,
  sgst,
  igst,
  totalAmount,
  paymentMethod,
  customerName,
  customerPhone = '',
  businessName = 'SupplementShop Pro',
  businessAddress = '',
  businessGstin = '',
  businessState = '',
  businessStateCode = '',
  date,
  onClose,
}: ReceiptProps) {
  const [phone, setPhone] = useState(customerPhone || '')
  const [generating, setGenerating] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

      const isInterState = igst > 0
      const invoiceDate = date ? formatDateTime(date) : formatDateTime(new Date())

      const formatRs = (amt: number) => `Rs. ${Number(amt).toFixed(2)}`

  const generatePdf = async (): Promise<Blob | null> => {
    try {
      setGenerating(true)
      const { jsPDF } = await import('jspdf')

      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pw = doc.internal.pageSize.getWidth()
      const ph = doc.internal.pageSize.getHeight()
      const ml = 12, mr = 12
      const rx = pw - mr
      const cx = pw / 2
      let y = 10

      const checkPage = (n: number = 15) => { if (y + n > ph - 12) { doc.addPage(); y = 12 } }

      const trunc = (t: string, max: number): string => {
        if (doc.getTextWidth(t) <= max) return t
        let s = t
        while (s.length > 0 && doc.getTextWidth(s + '..') > max) s = s.slice(0, -1)
        return s + '..'
      }

      const line = (x1: number, yy: number, x2: number, w: number = 0.2) => {
        doc.setLineWidth(w)
        doc.setLineDashPattern([], 0)
        doc.line(x1, yy, x2, yy)
      }

      const dashLine = (x1: number, yy: number, x2: number) => {
        doc.setLineWidth(0.15)
        doc.setLineDashPattern([1.5, 1.5], 0)
        doc.line(x1, yy, x2, yy)
        doc.setLineDashPattern([], 0)
      }

      const left = (txt: string, yy: number, sz: number = 8) => { doc.setFontSize(sz); doc.setFont('courier', 'normal'); doc.text(txt, ml, yy) }
      const boldRight = (txt: string, yy: number, sz: number = 8) => { doc.setFontSize(sz); doc.setFont('courier', 'bold'); doc.text(txt, rx, yy, { align: 'right' }) }

      // ===== HEADER =====
      doc.setFontSize(14)
      doc.setFont('courier', 'bold')
      doc.text('TAX INVOICE', cx, y, { align: 'center' })
      y += 7

      line(ml, y, rx, 0.4)
      y += 5

      // ===== SUPPLIER DETAILS (LEFT) & INVOICE DETAILS (RIGHT) =====
      const halfW = (rx - ml) / 2
      const rightColX = ml + halfW + 3

      // Supplier
      doc.setFontSize(8)
      doc.setFont('courier', 'bold')
      doc.text('Supplier (Bill From):', ml, y)
      y += 4
      doc.setFont('courier', 'bold')
      doc.setFontSize(9)
      doc.text(trunc(businessName, halfW - 2), ml, y)
      y += 4
      doc.setFont('courier', 'normal')
      doc.setFontSize(7)
      if (businessAddress) {
        const addr = trunc(businessAddress, halfW - 2)
        doc.text(addr, ml, y)
        y += 3.5
      }
      if (businessGstin) {
        doc.text(`GSTIN: ${businessGstin}`, ml, y)
        y += 3.5
      }
      if (businessState) {
        doc.text(`State: ${businessState} (${businessStateCode})`, ml, y)
        y += 3.5
      }

      // Invoice details (right side)
      let ry = y - 12
      doc.setFont('courier', 'bold')
      doc.setFontSize(8)
      doc.text('Invoice No:', rightColX, ry)
      doc.setFont('courier', 'normal')
      doc.text(invoiceNumber, rx, ry, { align: 'right' })
      ry += 4.5
      doc.setFont('courier', 'bold')
      doc.text('Invoice Date:', rightColX, ry)
      doc.setFont('courier', 'normal')
      doc.text(invoiceDate, rx, ry, { align: 'right' })
      ry += 4.5
      doc.setFont('courier', 'bold')
      doc.text('Mode of Payment:', rightColX, ry)
      doc.setFont('courier', 'normal')
      doc.text(paymentMethod, rx, ry, { align: 'right' })
      ry += 4.5
      if (customerName) {
        doc.setFont('courier', 'bold')
        doc.text('Place of Supply:', rightColX, ry)
        doc.setFont('courier', 'normal')
        doc.text(businessState ? `${businessState} (${businessStateCode})` : '-', rx, ry, { align: 'right' })
      }

      y = Math.max(y, ry) + 4
      line(ml, y, rx, 0.4)
      y += 4

      // ===== RECIPIENT DETAILS =====
      checkPage(20)
      doc.setFont('courier', 'bold')
      doc.setFontSize(8)
      doc.text('Recipient (Bill To):', ml, y)
      y += 4
      doc.setFont('courier', 'bold')
      doc.setFontSize(9)
      doc.text(customerName ? trunc(customerName, rx - ml - 2) : 'Walk-in Customer', ml, y)
      y += 4

      line(ml, y, rx, 0.2)
      y += 4

      // ===== ITEMS TABLE =====
      checkPage(30)
      const cSr = ml + 8
      const cDesc = ml + 18
      const cHsn = ml + 70
      const cQty = ml + 92
      const cRate = ml + 108
      const cTaxable = ml + 128
      const cTax = rx - 18
      const cTotal = rx

      // Header row
      doc.setFont('courier', 'bold')
      doc.setFontSize(6.5)
      doc.text('Sr', cSr, y, { align: 'center' })
      doc.text('Description', cDesc, y)
      doc.text('HSN', cHsn, y, { align: 'center' })
      doc.text('Qty', cQty, y, { align: 'center' })
      doc.text('Rate', cRate, y, { align: 'center' })
      doc.text('Taxable', cTaxable, y, { align: 'center' })
      doc.text(isInterState ? 'IGST' : 'CGST+SGST', cTax, y, { align: 'center' })
      doc.text('Amount', cTotal, y, { align: 'right' })
      y += 3.5
      dashLine(ml, y, rx)
      y += 3

      // Items
      doc.setFont('courier', 'normal')
      doc.setFontSize(7)
      items.forEach((item, i) => {
        checkPage(8)
        const gst = item.gstRate || 18
        const taxable = item.totalAmount
        const taxAmt = taxable * gst / 100
        const amount = taxable + taxAmt
        doc.text(String(i + 1), cSr, y, { align: 'center' })
        doc.text(trunc(item.name, cHsn - cDesc - 3), cDesc, y)
        doc.text(item.hsnCode || '-', cHsn, y, { align: 'center' })
        doc.text(String(item.quantity), cQty, y, { align: 'center' })
        doc.text(formatRs(item.unitPrice), cRate, y, { align: 'center' })
        doc.text(formatRs(taxable), cTaxable, y, { align: 'center' })
        doc.setFont('courier', 'bold')
        doc.text(isInterState ? `${gst}%` : `${(gst / 2).toFixed(0)}%`, cTax, y, { align: 'center' })
        doc.text(formatRs(amount), cTotal, y, { align: 'right' })
        doc.setFont('courier', 'normal')
        y += 4
      })

      y += 1
      dashLine(ml, y, rx)
      y += 4

      // ===== TOTALS =====
      checkPage(40)

      doc.setFont('courier', 'normal')
      doc.setFontSize(7.5)

      left('Total taxable value:', y, 7.5)
      boldRight(formatRs(subtotal - discount), y, 7.5)
      y += 4.5

      if (!isInterState) {
        if (cgst > 0) {
          left(`Central Tax (CGST):`, y, 7.5)
          boldRight(formatRs(cgst), y, 7.5)
          y += 4.5
        }
        if (sgst > 0) {
          left(`State Tax (SGST):`, y, 7.5)
          boldRight(formatRs(sgst), y, 7.5)
          y += 4.5
        }
      } else {
        if (igst > 0) {
          left(`Integrated Tax (IGST):`, y, 7.5)
          boldRight(formatRs(igst), y, 7.5)
          y += 4.5
        }
      }

      if (discount > 0) {
        left('Discount:', y, 7.5)
        boldRight(`-${formatRs(discount)}`, y, 7.5)
        y += 4.5
      }

      y += 1
      line(ml, y, rx, 0.4)
      y += 5

      doc.setFontSize(10)
      doc.setFont('courier', 'bold')
      doc.text('Total Amount (Rs.):', ml, y)
      doc.text(formatRs(totalAmount), rx, y, { align: 'right' })
      y += 5

      line(ml, y, rx, 0.4)
      y += 5

      // ===== AMOUNT IN WORDS =====
      doc.setFont('courier', 'bold')
      doc.setFontSize(7.5)
      doc.text('Amount Chargeable (in words):', ml, y)
      y += 4
      doc.setFont('courier', 'normal')
      doc.setFontSize(7)
      const amtWords = numberToWords(totalAmount)
      const maxW = rx - ml
      if (doc.getTextWidth(amtWords) > maxW) {
        const half = Math.ceil(amtWords.length / 2)
        let split = amtWords.lastIndexOf(' ', half)
        if (split === -1) split = half
        doc.text(amtWords.substring(0, split), ml, y)
        y += 3.5
        doc.text(amtWords.substring(split).trim(), ml, y)
      } else {
        doc.text(amtWords, ml, y)
      }
      y += 5

      line(ml, y, rx, 0.2)
      y += 4

      // ===== REVERSE CHARGE =====
      doc.setFont('courier', 'bold')
      doc.setFontSize(7.5)
      doc.text('Whether tax is payable on reverse charge basis: NO', ml, y)
      y += 5

      line(ml, y, rx, 0.2)
      y += 8

      // ===== SIGNATURE =====
      doc.setFont('courier', 'normal')
      doc.setFontSize(7.5)
      doc.text('For ' + businessName + ':', ml, y)
      y += 12
      line(ml, y, ml + 50, 0.2)
      y += 4
      doc.text('Authorized Signatory', ml, y)

      // Right side - terms
      doc.setFont('courier', 'normal')
      doc.setFontSize(6.5)
      const termsY = y - 16
      doc.text('Terms & Conditions:', rx - 60, termsY)
      doc.text('1. Goods once sold will not be taken back.', rx - 60, termsY + 4)
      doc.text('2. Subject to local jurisdiction.', rx - 60, termsY + 8)
      doc.text('3. E. & O.E.', rx - 60, termsY + 12)

      return doc.output('blob')
    } catch (err) {
      console.error('PDF generation failed:', err)
      return null
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = () => {
    const pw = window.open('', '_blank', 'width=800,height=1000')
    if (!pw) return

    const isInterState = igst > 0

    const itemRows = items.map((item, i) => {
      const gst = item.gstRate || 18
      const taxable = item.totalAmount
      const taxAmt = taxable * gst / 100
      const amount = taxable + taxAmt
      return `
        <tr style="border-bottom:1px dashed #ccc;">
          <td style="padding:5px 3px;font-size:8px;">${i + 1}</td>
          <td style="padding:5px 3px;font-size:8px;">${escapeHtml(item.name)}</td>
          <td style="padding:5px 3px;font-size:8px;text-align:center;">${item.hsnCode || '-'}</td>
          <td style="padding:5px 3px;font-size:8px;text-align:center;">${item.quantity}</td>
          <td style="padding:5px 3px;font-size:8px;text-align:right;">Rs. ${Number(item.unitPrice).toFixed(2)}</td>
          <td style="padding:5px 3px;font-size:8px;text-align:right;">Rs. ${taxable.toFixed(2)}</td>
          <td style="padding:5px 3px;font-size:8px;text-align:center;font-weight:bold;">${isInterState ? `${gst}%` : `${(gst / 2).toFixed(0)}%`}</td>
          <td style="padding:5px 3px;font-size:8px;text-align:right;font-weight:bold;">Rs. ${amount.toFixed(2)}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; padding:12px; font-size:8px; color:#000; background:#fff; }
  table { width:100%; border-collapse:collapse; }
  .label { font-weight:bold; font-size:7px; }
  .row { display:flex; justify-content:space-between; }
  .border-top { border-top:1px solid #000; }
  .border-dash { border-top:1px dashed #000; }
  .bold { font-weight:bold; }
  .small { font-size:7px; }
  @page { size:A4; margin:10mm; }
  @media print { body { padding:0; } }
</style></head><body>
  <div style="text-align:center;font-size:14px;font-weight:bold;">TAX INVOICE</div>
  <hr style="border:1px solid #000;margin:6px 0;">

  <div style="display:flex;gap:20px;">
    <div style="flex:1;">
      <div class="label">Supplier (Bill From):</div>
      <div style="font-weight:bold;font-size:10px;">${escapeHtml(businessName)}</div>
      ${businessAddress ? `<div class="small">${escapeHtml(businessAddress)}</div>` : ''}
      ${businessGstin ? `<div class="small">GSTIN: ${escapeHtml(businessGstin)}</div>` : ''}
      ${businessState ? `<div class="small">State: ${escapeHtml(businessState)} (${businessStateCode})</div>` : ''}
    </div>
    <div style="flex:1;">
      <div class="row"><span class="label">Invoice No:</span><span>${escapeHtml(invoiceNumber)}</span></div>
      <div class="row"><span class="label">Invoice Date:</span><span>${invoiceDate}</span></div>
      <div class="row"><span class="label">Mode of Payment:</span><span>${paymentMethod}</span></div>
      <div class="row"><span class="label">Place of Supply:</span><span>${businessState ? `${escapeHtml(businessState)} (${businessStateCode})` : '-'}</span></div>
    </div>
  </div>

  <hr class="border-dash" style="margin:6px 0;">

  <div>
    <span class="label">Recipient (Bill To):</span>
    <span style="font-weight:bold;">${customerName ? escapeHtml(customerName) : 'Walk-in Customer'}</span>
  </div>

  <hr class="border-dash" style="margin:6px 0;">

  <table>
    <thead>
      <tr style="border-bottom:1px dashed #ccc;">
        <th class="label" style="padding:3px;font-size:7px;width:5%;text-align:left;">Sr</th>
        <th class="label" style="padding:3px;font-size:7px;width:30%;text-align:left;">Description</th>
        <th class="label" style="padding:3px;font-size:7px;width:10%;text-align:center;">HSN</th>
        <th class="label" style="padding:3px;font-size:7px;width:8%;text-align:center;">Qty</th>
        <th class="label" style="padding:3px;font-size:7px;width:12%;text-align:right;">Rate</th>
        <th class="label" style="padding:3px;font-size:7px;width:15%;text-align:right;">Taxable</th>
        <th class="label" style="padding:3px;font-size:7px;width:10%;text-align:center;">${isInterState ? 'IGST' : 'CGST+SGST'}</th>
        <th class="label" style="padding:3px;font-size:7px;width:10%;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <hr class="border-dash" style="margin:6px 0;">

  <div style="max-width:250px;margin-left:auto;">
    <div class="row"><span>Total taxable value:</span><span class="bold">Rs. ${(subtotal - discount).toFixed(2)}</span></div>
    ${!isInterState && cgst > 0 ? `<div class="row"><span>Central Tax (CGST):</span><span class="bold">Rs. ${cgst.toFixed(2)}</span></div>` : ''}
    ${!isInterState && sgst > 0 ? `<div class="row"><span>State Tax (SGST):</span><span class="bold">Rs. ${sgst.toFixed(2)}</span></div>` : ''}
    ${isInterState && igst > 0 ? `<div class="row"><span>Integrated Tax (IGST):</span><span class="bold">Rs. ${igst.toFixed(2)}</span></div>` : ''}
    ${discount > 0 ? `<div class="row"><span>Discount:</span><span class="bold">-Rs. ${discount.toFixed(2)}</span></div>` : ''}
    <hr style="border:1px solid #000;margin:4px 0;">
    <div class="row" style="font-size:10px;font-weight:bold;"><span>Total Amount (Rs.):</span><span>Rs. ${totalAmount.toFixed(2)}</span></div>
    <hr style="border:1px solid #000;margin:4px 0;">
  </div>

  <div style="margin-top:6px;">
    <span class="label">Amount Chargeable (in words):</span>
    <div style="font-size:7px;">${numberToWords(totalAmount)}</div>
  </div>

  <hr class="border-dash" style="margin:6px 0;">

  <div style="font-size:7.5px;" class="label">Whether tax is payable on reverse charge basis: NO</div>

  <hr class="border-dash" style="margin:6px 0;">

  <div style="display:flex;justify-content:space-between;margin-top:20px;">
    <div>
      <div class="label">For ${escapeHtml(businessName)}:</div>
      <div style="margin-top:30px;border-top:1px solid #000;width:150px;"></div>
      <div class="small">Authorized Signatory</div>
    </div>
    <div style="font-size:6.5px;">
      <div class="label">Terms & Conditions:</div>
      <div>1. Goods once sold will not be taken back.</div>
      <div>2. Subject to local jurisdiction.</div>
      <div>3. E. & O.E.</div>
    </div>
  </div>
</body></html>`

    pw.document.open()
    pw.document.write(html)
    pw.document.close()
    pw.onload = () => { pw.focus(); pw.print() }
  }

  const handleDownloadPdf = async () => {
    const blob = await generatePdf()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Invoice-${invoiceNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleWhatsApp = async () => {
    // Generate PDF first
    const blob = await generatePdf()
    if (blob) {
      // Auto-download the PDF
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice-${invoiceNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }

    // Then open WhatsApp Web with text message
    const message = encodeURIComponent(
      `Hi! Please find the receipt for Invoice *${invoiceNumber}*.\n\n` +
      `Total: *Rs. ${totalAmount.toFixed(2)}*\n` +
      `Date: ${invoiceDate}\n\n` +
      `PDF invoice is attached. Please download and share.\n` +
      `Thank you for your purchase!`
    )
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const url = cleanPhone
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${message}`
      : `https://web.whatsapp.com/send?text=${message}`
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Tax Invoice Preview</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Invoice Preview */}
        <div ref={receiptRef} className="border border-gray-800 rounded p-4 mb-4 bg-white font-mono text-[10px] text-gray-900" style={{ lineHeight: '1.5' }}>
          <div className="text-center text-sm font-bold border-b-2 border-gray-800 pb-2 mb-3">TAX INVOICE</div>

          {/* Supplier + Invoice Details */}
          <div className="flex gap-4 mb-2">
            <div className="flex-1">
              <div className="text-[9px] font-bold text-gray-600">Supplier (Bill From):</div>
              <div className="text-[11px] font-bold">{businessName}</div>
              {businessAddress && <div className="text-[9px] text-gray-600">{businessAddress}</div>}
              {businessGstin && <div className="text-[9px] text-gray-600">GSTIN: {businessGstin}</div>}
              {businessState && <div className="text-[9px] text-gray-600">State: {businessState} ({businessStateCode})</div>}
            </div>
            <div className="flex-1 text-[9px] space-y-1">
              <div className="flex justify-between"><span className="font-bold">Invoice No:</span><span>{invoiceNumber}</span></div>
              <div className="flex justify-between"><span className="font-bold">Invoice Date:</span><span>{invoiceDate}</span></div>
              <div className="flex justify-between"><span className="font-bold">Mode of Payment:</span><span>{paymentMethod}</span></div>
              <div className="flex justify-between"><span className="font-bold">Place of Supply:</span><span>{businessState ? `${businessState} (${businessStateCode})` : '-'}</span></div>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2"></div>

          {/* Recipient */}
          <div className="mb-2">
            <span className="text-[9px] font-bold text-gray-600">Recipient (Bill To): </span>
            <span className="text-[10px] font-bold">{customerName || 'Walk-in Customer'}</span>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2"></div>

          {/* Items Table */}
          <table className="w-full mb-2">
            <thead>
              <tr className="border-b border-dashed border-gray-400">
                <th className="text-left text-[8px] font-bold py-1 w-[4%]">Sr</th>
                <th className="text-left text-[8px] font-bold py-1 w-[28%]">Description</th>
                <th className="text-center text-[8px] font-bold py-1 w-[10%]">HSN</th>
                <th className="text-center text-[8px] font-bold py-1 w-[7%]">Qty</th>
                <th className="text-right text-[8px] font-bold py-1 w-[11%]">Rate</th>
                <th className="text-right text-[8px] font-bold py-1 w-[14%]">Taxable</th>
                <th className="text-center text-[8px] font-bold py-1 w-[10%]">{isInterState ? 'IGST' : 'CGST+SGST'}</th>
                <th className="text-right text-[8px] font-bold py-1 w-[10%]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const gst = item.gstRate || 18
                const taxable = item.totalAmount
                const taxAmt = taxable * gst / 100
                const amount = taxable + taxAmt
                return (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-1 text-[8px]">{i + 1}</td>
                    <td className="py-1 text-[8px] truncate">{item.name}</td>
                    <td className="py-1 text-[8px] text-center">{item.hsnCode || '-'}</td>
                    <td className="py-1 text-[8px] text-center">{item.quantity}</td>
                    <td className="py-1 text-[8px] text-right">Rs. {Number(item.unitPrice).toFixed(2)}</td>
                    <td className="py-1 text-[8px] text-right">Rs. {taxable.toFixed(2)}</td>
                    <td className="py-1 text-[8px] text-center font-bold">{isInterState ? `${gst}%` : `${(gst / 2).toFixed(0)}%`}</td>
                    <td className="py-1 text-[8px] text-right font-bold">Rs. {amount.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="border-t border-dashed border-gray-400 my-2"></div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 text-[9px] space-y-1">
              <div className="flex justify-between"><span>Total taxable value:</span><span className="font-bold">Rs. {(subtotal - discount).toFixed(2)}</span></div>
              {!isInterState && cgst > 0 && <div className="flex justify-between"><span>Central Tax (CGST):</span><span className="font-bold">Rs. {cgst.toFixed(2)}</span></div>}
              {!isInterState && sgst > 0 && <div className="flex justify-between"><span>State Tax (SGST):</span><span className="font-bold">Rs. {sgst.toFixed(2)}</span></div>}
              {isInterState && igst > 0 && <div className="flex justify-between"><span>Integrated Tax (IGST):</span><span className="font-bold">Rs. {igst.toFixed(2)}</span></div>}
              {discount > 0 && <div className="flex justify-between"><span>Discount:</span><span className="font-bold">-Rs. {discount.toFixed(2)}</span></div>}
              <div className="border-t-2 border-gray-800 pt-1 flex justify-between text-[11px] font-bold">
                <span>Total Amount (Rs.):</span><span>Rs. {totalAmount.toFixed(2)}</span>
              </div>
              <div className="border-b-2 border-gray-800"></div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="mt-3">
            <div className="text-[9px] font-bold text-gray-600">Amount Chargeable (in words):</div>
            <div className="text-[9px]">{numberToWords(totalAmount)}</div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2"></div>

          <div className="text-[9px] font-bold">Whether tax is payable on reverse charge basis: NO</div>

          <div className="border-t border-dashed border-gray-400 my-2"></div>

          {/* Signature */}
          <div className="flex justify-between mt-4">
            <div>
              <div className="text-[9px] font-bold">For {businessName}:</div>
              <div className="mt-8 border-t border-gray-800 w-40"></div>
              <div className="text-[8px] text-gray-600">Authorized Signatory</div>
            </div>
            <div className="text-[8px] text-gray-600">
              <div className="font-bold mb-1">Terms & Conditions:</div>
              <div>1. Goods once sold will not be taken back.</div>
              <div>2. Subject to local jurisdiction.</div>
              <div>3. E. & O.E.</div>
            </div>
          </div>
        </div>

        {/* Phone Input */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Customer Phone (with country code)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="919876543210"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <p className="text-[10px] text-gray-400 mt-1">Enter digits only: country code + number (e.g. 919876543210)</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex-1 px-3 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium text-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button onClick={handleDownloadPdf} disabled={generating} className="flex-1 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {generating ? 'Generating...' : 'PDF'}
          </button>
          <button onClick={handleWhatsApp} disabled={generating} className="flex-1 px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {generating ? 'Generating...' : 'WhatsApp'}
          </button>
        </div>

        {onClose && (
          <button onClick={onClose} className="w-full mt-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
            Close
          </button>
        )}
      </div>
    </div>
  )
}
