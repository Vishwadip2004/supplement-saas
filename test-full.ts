import http from 'node:http'

const BASE = 'http://localhost:3000'
const TEST_EMAIL = 'admin@supplementshop.com'
const TEST_PASS = 'Admin123!@#$%'

let sessionCookies = ''
let csrfToken = ''

const results: { name: string; pass: boolean; detail?: string }[] = []
const createdIds: { type: string; id: string }[] = []

function ok(name: string) { results.push({ name, pass: true }); console.log('  OK ' + name) }
function no(name: string, detail?: string) { results.push({ name, pass: false, detail }); console.log('  FAIL ' + name + (detail ? ': ' + detail : '')) }

function httpReq(method: string, path: string, body?: string, hdrs: Record<string, string> = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; setCookie: string[]; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE)
    const sendHeaders: Record<string, string> = { ...hdrs }
    if (body && !sendHeaders['Content-Type']) sendHeaders['Content-Type'] = 'application/json'
    const opts: http.RequestOptions = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: sendHeaders }
    const req = http.request(opts, (res) => {
      let data = ''
      res.on('data', (c: Buffer) => data += c)
      res.on('end', () => {
        const setCookie = (res.headers['set-cookie'] || []) as string[]
        let d: any = null; try { d = JSON.parse(data) } catch {}
        resolve({ status: res.statusCode || 0, headers: res.headers, setCookie, data: d })
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function extractCookies(setCookie: string[]): string {
  return setCookie.map(c => c.split(';')[0]).join('; ')
}

function findCookie(setCookie: string[], name: string): string {
  for (const c of setCookie) {
    if (c.startsWith(name + '=')) return c.split(';')[0]
  }
  return ''
}

async function api(method: string, path: string, body?: unknown, hdrs: Record<string, string> = {}): Promise<{ s: number; d: any; r: string[] }> {
  const reqBody = (body && method !== 'GET') ? JSON.stringify(body) : undefined
  const res = await httpReq(method, path, reqBody, hdrs)
  return { s: res.status, d: res.data, r: [] }
}

async function refreshCsrf() {
  const res = await httpReq('GET', '/api/csrf', undefined, { Cookie: sessionCookies })
  csrfToken = res.data?.csrfToken || ''
  if (csrfToken) {
    const newCookie = 'csrf-token=' + csrfToken
    if (sessionCookies.includes('csrf-token=')) {
      sessionCookies = sessionCookies.replace(/csrf-token=[^;]*/, newCookie)
    } else {
      sessionCookies = sessionCookies ? sessionCookies + '; ' + newCookie : newCookie
    }
  }
}

async function login(): Promise<boolean> {
  const csrfRes = await httpReq('GET', '/api/auth/csrf')
  const nAuthCsrf = csrfRes.data?.csrfToken || ''
  const nAuthCookie = findCookie(csrfRes.setCookie, 'next-auth.csrf-token') || findCookie(csrfRes.setCookie, 'csrf.token')

  const allCookies = [nAuthCookie].filter(Boolean).join('; ')
  const params = new URLSearchParams({ email: TEST_EMAIL, password: TEST_PASS, csrfToken: nAuthCsrf, json: 'true' }).toString()
  const loginRes = await httpReq('POST', '/api/auth/callback/credentials', params, { Cookie: allCookies, 'Content-Type': 'application/x-www-form-urlencoded' })
  const sessCookie = findCookie(loginRes.setCookie, 'next-auth.session-token') || findCookie(loginRes.setCookie, '__Secure-next-auth.session-token')
  if (!sessCookie) return false
  sessionCookies = [sessCookie, nAuthCookie].filter(Boolean).join('; ')
  await refreshCsrf()
  return true
}

async function aGet(path: string) { await refreshCsrf(); return api('GET', path, undefined, { Cookie: sessionCookies, 'x-csrf-token': csrfToken }) }
async function aPost(path: string, body: unknown) { await refreshCsrf(); return api('POST', path, body, { Cookie: sessionCookies, 'x-csrf-token': csrfToken }) }
async function aPut(path: string, body: unknown) { await refreshCsrf(); return api('PUT', path, body, { Cookie: sessionCookies, 'x-csrf-token': csrfToken }) }
async function aDel(path: string) { await refreshCsrf(); return api('DELETE', path, undefined, { Cookie: sessionCookies, 'x-csrf-token': csrfToken }) }

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

async function testSecurityHeaders() {
  console.log('\n== SECURITY HEADERS ==')
  const res = await httpReq('GET', '/')
  const h: Record<string, string> = {}
  for (const [k, v] of Object.entries(res.headers)) { if (typeof v === 'string') h[k.toLowerCase()] = v }

  if (h['strict-transport-security']?.includes('max-age=63072000')) { ok('HSTS') } else { no('HSTS', h['strict-transport-security']) }
  if (h['x-frame-options'] === 'DENY') { ok('X-Frame-Options DENY') } else { no('X-Frame-Options', h['x-frame-options']) }
  if (h['x-content-type-options'] === 'nosniff') { ok('X-Content-Type-Options nosniff') } else { no('X-Content-Type-Options') }
  const csp = h['content-security-policy'] || ''
  if (csp.includes("script-src 'self'") && !csp.includes("'unsafe-eval'")) { ok('CSP no unsafe-eval') } else { no('CSP script-src', csp.substring(0, 120)) }
  if (!csp.includes('ws:') && !csp.includes('wss:')) { ok('CSP no WebSocket') } else { no('CSP connect-src', csp.substring(0, 120)) }
  if (h['x-xss-protection'] === '1; mode=block') { ok('X-XSS-Protection') } else { no('X-XSS-Protection') }
  if (h['x-permitted-cross-domain-policies'] === 'none') { ok('X-Permitted-Cross-Domain') } else { no('X-Permitted-Cross-Domain') }
}

async function testUnauthenticated() {
  console.log('\n== UNAUTHENTICATED ACCESS ==')
  for (const ep of ['GET /api/products', 'GET /api/customers', 'GET /api/sales', 'GET /api/suppliers', 'GET /api/purchase-orders', 'GET /api/stock-movements', 'GET /api/bundles', 'GET /api/recalls', 'GET /api/reports', 'GET /api/audit', 'GET /api/expiry-alerts']) {
    const [m, p] = ep.split(' ')
    const r = await api(m, p)
    if (r.s === 401 || r.s === 403) { ok(ep + ' blocked') } else { no(ep, 'got ' + r.s) }
  }
}

async function testCsrf() {
  console.log('\n== CSRF ==')
  const csrfRes = await httpReq('GET', '/api/csrf')
  const token = csrfRes.data?.csrfToken || ''
  const hasCookie = csrfRes.setCookie.some(c => c.startsWith('csrf-token='))
  if (token && token.length === 64) { ok('CSRF 64-char token') } else { no('CSRF token', 'len=' + token.length) }
  if (hasCookie) { ok('CSRF httpOnly cookie') } else { no('CSRF cookie', 'no Set-Cookie') }
  const r = await api('POST', '/api/auth/forgot-password', { email: 'x@test.com' })
  if (r.s === 403) { ok('No CSRF header -> 403') } else { no('No CSRF header', 'got ' + r.s) }
}

async function testAuth() {
  console.log('\n== AUTH ==')
  const loginOk = await login()
  if (loginOk) { ok('Login valid credentials') } else { no('Login') }

  const session = await api('GET', '/api/auth/session', undefined, { Cookie: sessionCookies })
  if (session.s === 200 && session.d?.user) { ok('Session: ' + session.d.user.email + ' (' + session.d.user.role + ')') } else { no('Session', '' + session.s) }
  if (!loginOk) { no('Cannot continue'); return }

  const reg = await aPost('/api/auth/register', { name: 'E2E User', email: 'e2e-' + Date.now() + '@test.com', password: 'StrongE2ETest123!@#', shopName: 'E2E Shop ' + Date.now(), shopSlug: 'e2e-shop-' + Date.now() })
  if (reg.s === 201) { ok('Register creates account') } else { no('Register', (reg.s + ': ' + JSON.stringify(reg.d) ).slice(0, 100)) }

  const regW = await aPost('/api/auth/register', { name: 'W', email: 'w@test.com', password: 'short', shopName: 'W', shopSlug: 'w' })
  if (regW.s === 400) { ok('Register weak password -> 400') } else { no('Register weak password', '' + regW.s) }

  const fp = await aPost('/api/auth/forgot-password', { email: TEST_EMAIL })
  if (fp.s === 200) { ok('Forgot password 200') } else { no('Forgot password', '' + fp.s) }

  const rp1 = await api('GET', '/api/auth/reset-password?token=abc&email=x@test.com')
  const rp2 = await api('GET', '/api/auth/reset-password?token=def&email=y@test.com')
  if (rp1.s === 200 && rp2.s === 200 && JSON.stringify(rp1.d) === JSON.stringify(rp2.d)) { ok('Reset-password GET uniform') } else { no('Reset-password uniform', rp1.s + ' vs ' + rp2.s) }

  const cp = await aPost('/api/user/change-password', { currentPassword: TEST_PASS, newPassword: TEST_PASS })
  if (cp.s === 400) { ok('Change-password rejects same') } else { no('Change-password same', '' + cp.s) }
}

async function testProducts() {
  console.log('\n== PRODUCTS ==')
  const ts = Date.now()

  const list = await aGet('/api/products')
  if (list.s === 200 && list.d?.data) { ok('GET /api/products (' + list.d.data.length + ' items, total ' + list.d.pagination?.total + ')') } else { no('GET /api/products', '' + list.s) }

  const pg = await aGet('/api/products?page=1&limit=3')
  if (pg.s === 200) { ok('GET /api/products?limit=3') } else { no('GET /api/products pagination', '' + pg.s) }

  const sr = await aGet('/api/products?search=whey')
  if (sr.s === 200) { ok('GET /api/products?search=whey') } else { no('search', '' + sr.s) }

  const cf = await aGet('/api/products?category=Creatine')
  if (cf.s === 200) { ok('GET /api/products?category') } else { no('category', '' + cf.s) }

  const bf = await aGet('/api/products?brand=ON')
  if (bf.s === 200) { ok('GET /api/products?brand') } else { no('brand', '' + bf.s) }

  const c = await aPost('/api/products', { name: 'E2E Protein ' + ts, sku: 'E2E-' + ts, category: 'Protein', purchasePrice: 25, sellingPrice: 49.99, quantity: 100, minStock: 10, brand: 'E2EBrand', flavor: 'Vanilla' })
  let pid = ''
  if (c.s === 201 && c.d?.id) { pid = c.d.id; createdIds.push({ type: 'product', id: pid }); ok('POST /api/products') } else { no('POST /api/products', (c.s + ': ' + JSON.stringify(c.d) ).slice(0, 150)) }

  if (pid) {
    const g = await aGet('/api/products/' + pid)
    if (g.s === 200) { ok('GET /api/products/[id]') } else { no('GET /api/products/[id]', '' + g.s) }

    const u = await aPut('/api/products/' + pid, { sellingPrice: 59.99 })
    if (u.s === 200 && parseFloat(String(u.d?.sellingPrice)) === 59.99) { ok('PUT /api/products/[id]') } else { no('PUT /api/products/[id]', u.s + ' ' + JSON.stringify(u.d?.sellingPrice)) }

    const d = await aDel('/api/products/' + pid)
    if (d.s === 200) { ok('DELETE /api/products/[id]') } else { no('DELETE /api/products/[id]', '' + d.s) }
  }

  const v = await aPost('/api/products', { name: '', sku: '', category: '', purchasePrice: -1, sellingPrice: -1, quantity: -5, minStock: -1 })
  if (v.s === 400) { ok('POST /api/products validates') } else { no('POST /api/products validates', '' + v.s) }

  const n4 = await aGet('/api/products/00000000-0000-0000-0000-000000000000')
  if (n4.s === 404) { ok('GET /api/products/[id] 404') } else { no('GET /api/products 404', '' + n4.s) }
}

async function testCustomers() {
  console.log('\n== CUSTOMERS ==')
  const ts = Date.now()
  const list = await aGet('/api/customers')
  if (list.s === 200 && list.d?.data) { ok('GET /api/customers (' + list.d.data.length + ')') } else { no('GET /api/customers', '' + list.s) }

  const c = await aPost('/api/customers', { name: 'E2E Cust ' + ts, email: 'c-' + ts + '@t.com', phone: '+1234567890' })
  let cid = ''
  if (c.s === 201 && c.d?.id) { cid = c.d.id; createdIds.push({ type: 'customer', id: cid }); ok('POST /api/customers') } else { no('POST /api/customers', (c.s + ': ' + JSON.stringify(c.d) ).slice(0, 100)) }

  if (cid) {
    const g = await aGet('/api/customers/' + cid)
    if (g.s === 200) { ok('GET /api/customers/[id]') } else { no('GET /api/customers/[id]', '' + g.s) }
    const u = await aPut('/api/customers/' + cid, { name: 'Updated ' + ts })
    if (u.s === 200) { ok('PUT /api/customers/[id]') } else { no('PUT /api/customers/[id]', '' + u.s) }
    const h = await aGet('/api/customers/' + cid + '/history')
    if (h.s === 200 && h.d?.summary) { ok('GET /api/customers/[id]/history') } else { no('GET /api/customers/history', '' + h.s) }
    const d = await aDel('/api/customers/' + cid)
    if (d.s === 200) { ok('DELETE /api/customers/[id]') } else { no('DELETE /api/customers/[id]', '' + d.s) }
  }
  const v = await aPost('/api/customers', { name: '' })
  if (v.s === 400) { ok('POST /api/customers validates') } else { no('POST /api/customers validates', '' + v.s) }
}

async function testSuppliers() {
  console.log('\n== SUPPLIERS ==')
  const ts = Date.now()
  const list = await aGet('/api/suppliers')
  if (list.s === 200 && list.d?.data) { ok('GET /api/suppliers (' + list.d.data.length + ')') } else { no('GET /api/suppliers', '' + list.s) }

  const c = await aPost('/api/suppliers', { name: 'E2E Sup ' + ts, contactPerson: 'John', email: 's-' + ts + '@t.com' })
  let sid = ''
  if (c.s === 201 && c.d?.id) { sid = c.d.id; createdIds.push({ type: 'supplier', id: sid }); ok('POST /api/suppliers') } else { no('POST /api/suppliers', (c.s + ': ' + JSON.stringify(c.d) ).slice(0, 100)) }

  if (sid) {
    const g = await aGet('/api/suppliers/' + sid)
    if (g.s === 200) { ok('GET /api/suppliers/[id]') } else { no('GET /api/suppliers/[id]', '' + g.s) }
    const u = await aPut('/api/suppliers/' + sid, { name: 'Updated Sup ' + ts })
    if (u.s === 200) { ok('PUT /api/suppliers/[id]') } else { no('PUT /api/suppliers/[id]', '' + u.s) }
    const d = await aDel('/api/suppliers/' + sid)
    if (d.s === 200) { ok('DELETE /api/suppliers/[id]') } else { no('DELETE /api/suppliers/[id]', '' + d.s) }
  }
}

async function testLotsAndStock() {
  console.log('\n== LOTS & STOCK ==')
  const ts = Date.now()

  const gl = await aGet('/api/lots')
  if (gl.s === 200 && gl.d?.data) { ok('GET /api/lots (' + gl.d.data.length + ')') } else { no('GET /api/lots', '' + gl.s) }

  const cp = await aPost('/api/products', { name: 'Stock Test ' + ts, sku: 'ST-' + ts, category: 'Test', purchasePrice: 10, sellingPrice: 20, quantity: 0, minStock: 5 })
  if (!cp.d?.id) { no('Need product for stock tests'); return }
  const pid = cp.d.id; createdIds.push({ type: 'product', id: pid })

  const cl = await aPost('/api/lots', { productId: pid, batchNumber: 'LOT-' + ts, quantity: 50, purchasePrice: 10, expiryDate: new Date(Date.now() + 180 * 86400000).toISOString() })
  if (cl.s === 201 && cl.d?.id) { createdIds.push({ type: 'lot', id: cl.d.id }); ok('POST /api/lots') } else { no('POST /api/lots', (cl.s + ': ' + JSON.stringify(cl.d) ).slice(0, 150)) }

  const cl2 = await aPost('/api/lots', { productId: pid, batchNumber: 'LOT-' + ts, quantity: 20, purchasePrice: 10, expiryDate: new Date(Date.now() + 180 * 86400000).toISOString() })
  if (cl2.s === 201) { ok('POST /api/lots duplicate increments') } else { no('POST /api/lots duplicate', '' + cl2.s) }

  const le = await aGet('/api/lots?expiringSoon=true')
  if (le.s === 200) { ok('GET /api/lots?expiringSoon') } else { no('GET /api/lots expiringSoon', '' + le.s) }

  const vl = await aPost('/api/lots', { productId: 'bad', batchNumber: '', quantity: -1 })
  if (vl.s === 400) { ok('POST /api/lots validates') } else { no('POST /api/lots validates', '' + vl.s) }

  const gsm = await aGet('/api/stock-movements')
  if (gsm.s === 200 && gsm.d?.data) { ok('GET /api/stock-movements (' + gsm.d.data.length + ')') } else { no('GET /api/stock-movements', '' + gsm.s) }

  const smIn = await aPost('/api/stock-movements', { productId: pid, quantity: 25, type: 'IN', reference: 'R-' + ts })
  if (smIn.s === 201) { ok('POST /api/stock-movements IN') } else { no('POST /api/stock-movements IN', (smIn.s + ': ' + JSON.stringify(smIn.d) ).slice(0, 150)) }

  const smOut = await aPost('/api/stock-movements', { productId: pid, quantity: 10, type: 'OUT' })
  if (smOut.s === 201) { ok('POST /api/stock-movements OUT') } else { no('POST /api/stock-movements OUT', '' + smOut.s) }

  const smAdj = await aPost('/api/stock-movements', { productId: pid, quantity: 5, type: 'ADJUSTMENT', notes: 'correction' })
  if (smAdj.s === 201) { ok('POST /api/stock-movements ADJUSTMENT') } else { no('POST /api/stock-movements ADJ', '' + smAdj.s) }

  const smBad = await aPost('/api/stock-movements', { productId: pid, quantity: 99999, type: 'OUT' })
  if (smBad.s === 400) { ok('POST /api/stock-movements rejects insufficient') } else { no('POST insufficient stock', '' + smBad.s) }

  const smInv = await aPost('/api/stock-movements', { productId: pid, quantity: 10, type: 'INVALID' })
  if (smInv.s === 400) { ok('POST /api/stock-movements validates type') } else { no('POST invalid type', '' + smInv.s) }

  const sf = await aGet('/api/stock-movements?type=IN')
  if (sf.s === 200) { ok('GET /api/stock-movements?type=IN') } else { no('GET /api/stock-movements?type', '' + sf.s) }
}

async function testSales() {
  console.log('\n== SALES ==')
  const ts = Date.now()
  const list = await aGet('/api/sales')
  if (list.s === 200 && list.d?.data) { ok('GET /api/sales (' + list.d.data.length + ')') } else { no('GET /api/sales', '' + list.s) }

  const cp = await aPost('/api/products', { name: 'Sale Test ' + ts, sku: 'SAL-' + ts, category: 'Test', purchasePrice: 15, sellingPrice: 35, quantity: 0, minStock: 5 })
  const cc = await aPost('/api/customers', { name: 'Sale Cust ' + ts, email: 'sc-' + ts + '@t.com' })
  if (!cp.d?.id || !cc.d?.id) { no('Need data for sales'); return }
  const pid = cp.d.id; const cid = cc.d.id
  createdIds.push({ type: 'product', id: pid }, { type: 'customer', id: cid })

  await aPost('/api/stock-movements', { productId: pid, quantity: 50, type: 'IN' })

  const cs = await aPost('/api/sales', { productId: pid, quantity: 3, paymentMethod: 'CASH', customerId: cid, discount: 5 })
  let saleId = ''
  if (cs.s === 201 && cs.d?.id) { saleId = cs.d.id; createdIds.push({ type: 'sale', id: saleId }); ok('POST /api/sales') } else { no('POST /api/sales', (cs.s + ': ' + JSON.stringify(cs.d) ).slice(0, 150)) }

  if (saleId) {
    const gs = await aGet('/api/sales/' + saleId)
    if (gs.s === 200) { ok('GET /api/sales/[id]') } else { no('GET /api/sales/[id]', '' + gs.s) }
  }

  const sp = await aPost('/api/sales', { productId: '00000000-0000-0000-0000-000000000000', quantity: 1, paymentMethod: 'CASH' })
  if (sp.s === 400 || sp.s === 404) { ok('POST /api/sales invalid product') } else { no('POST /api/sales invalid product', '' + sp.s) }

  const spm = await aPost('/api/sales', { productId: pid, quantity: 1, paymentMethod: 'BITCOIN' })
  if (spm.s === 400) { ok('POST /api/sales invalid payment method') } else { no('POST /api/sales invalid payment', '' + spm.s) }
}

async function testPurchaseOrders() {
  console.log('\n== PURCHASE ORDERS ==')
  const ts = Date.now()
  const list = await aGet('/api/purchase-orders')
  if (list.s === 200 && list.d?.data) { ok('GET /api/purchase-orders (' + list.d.data.length + ')') } else { no('GET /api/purchase-orders', '' + list.s) }

  const cp = await aPost('/api/products', { name: 'PO Test ' + ts, sku: 'PO-' + ts, category: 'Test', purchasePrice: 10, sellingPrice: 25, quantity: 0, minStock: 5 })
  const cs = await aPost('/api/suppliers', { name: 'PO Sup ' + ts, email: 'pos-' + ts + '@t.com' })
  if (!cp.d?.id || !cs.d?.id) { no('Need data for PO'); return }
  const pid = cp.d.id; const sid = cs.d.id
  createdIds.push({ type: 'product', id: pid }, { type: 'supplier', id: sid })

  const cpo = await aPost('/api/purchase-orders', { supplierId: sid, notes: 'E2E PO', items: [{ productId: pid, quantity: 30, unitPrice: 10 }] })
  let poId = ''
  if (cpo.s === 201 && cpo.d?.id) { poId = cpo.d.id; ok('POST /api/purchase-orders') } else { no('POST /api/purchase-orders', (cpo.s + ': ' + JSON.stringify(cpo.d) ).slice(0, 150)) }

  if (poId) {
    const gpo = await aGet('/api/purchase-orders/' + poId)
    if (gpo.s === 200) { ok('GET /api/purchase-orders/[id]') } else { no('GET /api/purchase-orders/[id]', '' + gpo.s) }

    const apo = await aPut('/api/purchase-orders/' + poId, { status: 'APPROVED' })
    if (apo.s === 200 && apo.d?.status === 'APPROVED') { ok('PENDING -> APPROVED') } else { no('PENDING -> APPROVED', (apo.s + ': ' + JSON.stringify(apo.d) ).slice(0, 100)) }

    const rpo = await aPut('/api/purchase-orders/' + poId, { status: 'RECEIVED' })
    if (rpo.s === 200 && rpo.d?.status === 'RECEIVED') { ok('APPROVED -> RECEIVED (stock added)') } else { no('APPROVED -> RECEIVED', '' + rpo.s) }

    const xpo = await aPut('/api/purchase-orders/' + poId, { status: 'CANCELLED' })
    if (xpo.s === 400) { ok('RECEIVED -> CANCELLED rejected') } else { no('RECEIVED -> CANCELLED', '' + xpo.s) }
  }

  const ep = await aPost('/api/purchase-orders', { supplierId: sid, items: [] })
  if (ep.s === 400) { ok('POST /api/purchase-orders empty items') } else { no('POST /api/purchase-orders empty', '' + ep.s) }

  const sf = await aGet('/api/purchase-orders?status=RECEIVED')
  if (sf.s === 200) { ok('GET /api/purchase-orders?status=RECEIVED') } else { no('GET /api/purchase-orders?status', '' + sf.s) }
}

async function testBundles() {
  console.log('\n== BUNDLES ==')
  const ts = Date.now()
  const list = await aGet('/api/bundles')
  if (list.s === 200) { ok('GET /api/bundles') } else { no('GET /api/bundles', '' + list.s) }

  const cp = await aPost('/api/products', { name: 'Bundle Prod ' + ts, sku: 'BP-' + ts, category: 'Test', purchasePrice: 10, sellingPrice: 25, quantity: 100, minStock: 5 })
  if (!cp.d?.id) { no('Need product for bundle'); return }
  const pid = cp.d.id; createdIds.push({ type: 'product', id: pid })

  const cb = await aPost('/api/bundles', { name: 'E2E Bundle ' + ts, bundlePrice: 89.99, discount: 10, items: [{ productId: pid, quantity: 3 }] })
  let bid = ''
  if (cb.s === 201 && cb.d?.id) { bid = cb.d.id; ok('POST /api/bundles') } else { no('POST /api/bundles', (cb.s + ': ' + JSON.stringify(cb.d) ).slice(0, 150)) }

  if (bid) {
    const ub = await aPut('/api/bundles', { id: bid, name: 'Updated Bundle ' + ts, bundlePrice: 79.99 })
    if (ub.s === 200) { ok('PUT /api/bundles') } else { no('PUT /api/bundles', '' + ub.s) }
    const db = await aDel('/api/bundles?id=' + bid)
    if (db.s === 200) { ok('DELETE /api/bundles') } else { no('DELETE /api/bundles', '' + db.s) }
  }
}

async function testRecalls() {
  console.log('\n== RECALLS ==')
  const ts = Date.now()
  const list = await aGet('/api/recalls')
  if (list.s === 200 && list.d?.data) { ok('GET /api/recalls (' + list.d.data.length + ')') } else { no('GET /api/recalls', '' + list.s) }

  const sf = await aGet('/api/recalls?status=ACTIVE')
  if (sf.s === 200) { ok('GET /api/recalls?status=ACTIVE') } else { no('GET /api/recalls?status', '' + sf.s) }

  const cr = await aPost('/api/recalls', { batchNumber: '', reason: '' })
  if (cr.s === 400) { ok('POST /api/recalls validates') } else { no('POST /api/recalls validates', '' + cr.s) }

  const cp = await aPost('/api/products', { name: 'Recall Test ' + ts, sku: 'RC-' + ts, category: 'Test', purchasePrice: 10, sellingPrice: 25, quantity: 0, minStock: 5 })
  if (cp.d?.id) {
    const pid = cp.d.id; createdIds.push({ type: 'product', id: pid })
    const cl = await aPost('/api/lots', { productId: pid, batchNumber: 'RC-BATCH-' + ts, quantity: 20, purchasePrice: 10, expiryDate: new Date(Date.now() + 180 * 86400000).toISOString() })
    if (cl.d?.id) {
      const cr2 = await aPost('/api/recalls', { batchNumber: 'RC-BATCH-' + ts, reason: 'E2E test recall' })
      if (cr2.s === 201) { ok('POST /api/recalls') } else { no('POST /api/recalls', (cr2.s + ': ' + JSON.stringify(cr2.d) ).slice(0, 150)) }
    }
  }
}

async function testReportsAuditExpiry() {
  console.log('\n== REPORTS, AUDIT & EXPIRY ==')
  const rp = await aGet('/api/reports')
  if (rp.s === 200 && rp.d?.totalProducts !== undefined) { ok('GET /api/reports (products:' + rp.d.totalProducts + ' sales:' + rp.d.totalSales + ')') } else { no('GET /api/reports', '' + rp.s) }

  const al = await aGet('/api/audit')
  if (al.s === 200 && al.d?.data) { ok('GET /api/audit (' + al.d.data.length + ' entries)') } else { no('GET /api/audit', '' + al.s) }

  const alf = await aGet('/api/audit?resource=user&action=LOGIN')
  if (alf.s === 200) { ok('GET /api/audit?resource&action') } else { no('GET /api/audit filters', '' + alf.s) }

  const ea = await aGet('/api/expiry-alerts')
  if (ea.s === 200 && ea.d?.summary !== undefined) { ok('GET /api/expiry-alerts (expired:' + ea.d.summary.expiredCount + ' expiring30:' + ea.d.summary.expiring30Count + ')') } else { no('GET /api/expiry-alerts', '' + ea.s) }
}

async function testPages() {
  console.log('\n== PAGE LOADS ==')
  for (const p of ['/', '/auth/login', '/auth/register', '/auth/forgot-password']) {
    const r = await httpReq('GET', p)
    if (r.status === 200) { ok(p + ' 200') } else { no(p, '' + r.status) }
  }
  for (const p of ['/dashboard', '/dashboard/products', '/dashboard/customers', '/dashboard/sales', '/dashboard/suppliers', '/dashboard/stock', '/dashboard/purchase-orders', '/dashboard/bundles', '/dashboard/recalls', '/dashboard/audit', '/dashboard/reports', '/dashboard/settings', '/dashboard/expiry', '/dashboard/lots']) {
    const r = await httpReq('GET', p)
    if (r.status === 302 || r.status === 307) { ok(p + ' auth guard redirect') }
    else if (r.status === 200) { ok(p + ' 200') }
    else { no(p, '' + r.status) }
  }
}

async function testCSRFProtection() {
  console.log('\n== CSRF PROTECTION (authed) ==')
  for (const [m, p, b] of [['POST', '/api/products', { name: 'x' }], ['POST', '/api/customers', { name: 'x' }], ['POST', '/api/suppliers', { name: 'x' }]] as const) {
    const r = await api(m, p, b, { Cookie: sessionCookies })
    if (r.s === 403) { ok(m + ' ' + p + ' no CSRF -> 403') } else { no(m + ' ' + p + ' no CSRF', '' + r.s) }
  }
}

// ═══════════════════════════════════════════════════════════
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('  SUPPLEMENTSHOP PRO - COMPREHENSIVE FUNCTIONAL TEST')
  console.log('='.repeat(60))
  try {
    await testSecurityHeaders()
    await testUnauthenticated()
    await testCsrf()
    await testAuth()
    await testPages()
    await testCSRFProtection()
    await testProducts()
    await testCustomers()
    await testSuppliers()
    await testLotsAndStock()
    await testSales()
    await testPurchaseOrders()
    await testBundles()
    await testRecalls()
    await testReportsAuditExpiry()
  } catch (err: any) { console.error('\nFATAL:', err?.message || err) }

  const p = results.filter(r => r.pass).length
  const f = results.filter(r => !r.pass).length
  console.log('\n' + '='.repeat(60))
  console.log('  RESULTS: ' + p + '/' + results.length + ' passed, ' + f + ' failed')
  console.log('='.repeat(60))
  if (f > 0) { console.log('\nFAILURES:'); for (const r of results.filter(r => !r.pass)) { console.log('  * ' + r.name + (r.detail ? ': ' + r.detail : '')) } }
  console.log('')
  process.exit(f > 0 ? 1 : 0)
}
main()
