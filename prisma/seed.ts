import { PrismaClient, Role, PaymentMethod } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'supplement-shop' },
    update: {},
    create: {
      name: 'Supplement Shop',
      slug: 'supplement-shop',
      plan: 'pro',
    },
  })

  console.log('Created tenant:', tenant.name)

  const adminPassword = await bcrypt.hash('Admin123!@#$', 12)
  const staffPassword = await bcrypt.hash('Staff123!@#$', 12)

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@supplementshop.com' } },
    update: {},
    create: {
      email: 'admin@supplementshop.com',
      name: 'Admin User',
      password: adminPassword,
      role: Role.ADMIN,
      tenantId: tenant.id,
    },
  })

  const manager = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'manager@supplementshop.com' } },
    update: {},
    create: {
      email: 'manager@supplementshop.com',
      name: 'Manager User',
      password: staffPassword,
      role: Role.MANAGER,
      tenantId: tenant.id,
    },
  })

  const staff = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'staff@supplementshop.com' } },
    update: {},
    create: {
      email: 'staff@supplementshop.com',
      name: 'Staff User',
      password: staffPassword,
      role: Role.STAFF,
      tenantId: tenant.id,
    },
  })

  console.log('Created users:', admin.email, manager.email, staff.email)

  const products = [
    { name: 'Whey Protein Isolate', sku: 'WP-001', category: 'Protein', brand: 'Optimum Nutrition', purchasePrice: 45.00, sellingPrice: 69.99, quantity: 50, minStock: 10, expiryDate: new Date('2026-12-31') },
    { name: 'Creatine Monohydrate', sku: 'CM-002', category: 'Performance', brand: 'MuscleTech', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 5, minStock: 15, expiryDate: new Date('2026-09-15') },
    { name: 'BCAA Powder', sku: 'BC-003', category: 'Amino Acids', brand: 'Ghost', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 30, minStock: 10, expiryDate: new Date('2026-11-20') },
    { name: 'Pre-Workout Energy', sku: 'PW-004', category: 'Pre-Workout', brand: 'C4 Original', purchasePrice: 20.00, sellingPrice: 39.99, quantity: 25, minStock: 10, expiryDate: new Date('2026-08-10') },
    { name: 'Fish Oil Omega-3', sku: 'FO-005', category: 'Health', brand: 'Nordic Naturals', purchasePrice: 15.00, sellingPrice: 29.99, quantity: 40, minStock: 10, expiryDate: new Date('2027-01-15') },
    { name: 'Multivitamin Complex', sku: 'MV-006', category: 'Vitamins', brand: 'GNC Mega Men', purchasePrice: 10.00, sellingPrice: 22.99, quantity: 60, minStock: 20, expiryDate: new Date('2027-03-01') },
    { name: 'Mass Gainer 1250', sku: 'MG-007', category: 'Protein', brand: 'BSN True-Mass', purchasePrice: 35.00, sellingPrice: 59.99, quantity: 8, minStock: 10, expiryDate: new Date('2026-07-20') },
    { name: 'Glutamine Recovery', sku: 'GL-008', category: 'Recovery', brand: 'Dymatize', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 35, minStock: 10, expiryDate: new Date('2026-10-30') },
    { name: 'Fat Burner Thermogenic', sku: 'FB-009', category: 'Weight Loss', brand: 'Hydroxycut', purchasePrice: 16.00, sellingPrice: 32.99, quantity: 20, minStock: 10, expiryDate: new Date('2026-12-01') },
    { name: 'ZMA Recovery Blend', sku: 'ZM-010', category: 'Recovery', brand: 'NOW Sports', purchasePrice: 8.00, sellingPrice: 18.99, quantity: 45, minStock: 10, expiryDate: new Date('2027-02-28') },
  ]

  const createdProducts = []
  for (const product of products) {
    const p = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: product.sku } },
      update: {},
      create: {
        ...product,
        storageLocation: 'Warehouse A',
        batchNumber: `BATCH-${product.sku}`,
        tenantId: tenant.id,
      },
    })
    createdProducts.push(p)
  }

  console.log('Created', createdProducts.length, 'products')

  const customers = [
    { name: 'John Smith', email: 'john@example.com', phone: '555-0101' },
    { name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0102' },
    { name: 'Mike Williams', email: 'mike@example.com', phone: '555-0103' },
    { name: 'Emily Brown', email: 'emily@example.com', phone: '555-0104' },
    { name: 'Chris Davis', phone: '555-0105' },
  ]

  const createdCustomers = []
  for (const customer of customers) {
    const c = await prisma.customer.create({
      data: { ...customer, tenantId: tenant.id },
    })
    createdCustomers.push(c)
  }

  console.log('Created', createdCustomers.length, 'customers')

  const suppliers = [
    { name: 'NutriCorp Wholesale', contactPerson: 'David Lee', email: 'david@nutricorp.com', phone: '555-1001', address: '123 Industrial Blvd, LA, CA' },
    { name: 'FitSupply Co', contactPerson: 'Lisa Wang', email: 'lisa@fitsupply.com', phone: '555-1002', address: '456 Commerce St, NY, NY' },
    { name: 'Global Supplements Inc', contactPerson: 'James Miller', email: 'james@globalsupp.com', phone: '555-1003', address: '789 Trade Ave, Chicago, IL' },
  ]

  const createdSuppliers = []
  for (const supplier of suppliers) {
    const s = await prisma.supplier.create({
      data: { ...supplier, tenantId: tenant.id },
    })
    createdSuppliers.push(s)
  }

  console.log('Created', createdSuppliers.length, 'suppliers')

  const paymentMethods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.TRANSFER]
  const sales = []
  for (let i = 0; i < 15; i++) {
    const product = createdProducts[i % createdProducts.length]
    const quantity = Math.floor(Math.random() * 3) + 1
    const unitPrice = Number(product.sellingPrice)
    const discount = i % 3 === 0 ? 5.00 : 0
    const totalAmount = unitPrice * quantity - discount

    sales.push({
      productId: product.id,
      customerId: i < createdCustomers.length ? createdCustomers[i].id : null,
      quantity,
      unitPrice,
      discount,
      totalAmount,
      paymentMethod: paymentMethods[i % paymentMethods.length],
      tenantId: tenant.id,
    })
  }

  for (const sale of sales) {
    await prisma.sale.create({ data: sale })
  }

  console.log('Created', sales.length, 'sales')
  console.log('Seed complete!')
  console.log('')
  console.log('Login credentials:')
  console.log('  Admin:  admin@supplementshop.com / Admin123!@#$')
  console.log('  Manager: manager@supplementshop.com / Staff123!@#$')
  console.log('  Staff:  staff@supplementshop.com / Staff123!@#$')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
