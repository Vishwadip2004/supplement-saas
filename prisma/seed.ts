import 'dotenv/config'
import { PrismaClient, Role, PaymentMethod } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function generatePassword(): string {
  return crypto.randomBytes(18).toString('base64url').slice(0, 16) + '!A1'
}

const products = [
  // ═══════════════════════════════════════════════════════════════
  // WHEY PROTEIN (32 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Gold Standard 100% Whey', sku: 'ON-WP-001', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Double Rich Chocolate', purchasePrice: 42.00, sellingPrice: 69.99, quantity: 60, minStock: 15, expiryDate: new Date('2027-06-01') },
  { name: 'Gold Standard 100% Whey', sku: 'ON-WP-002', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Vanilla Ice Cream', purchasePrice: 42.00, sellingPrice: 69.99, quantity: 55, minStock: 15, expiryDate: new Date('2027-06-01') },
  { name: 'Gold Standard 100% Whey', sku: 'ON-WP-003', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Strawberries & Cream', purchasePrice: 42.00, sellingPrice: 69.99, quantity: 45, minStock: 12, expiryDate: new Date('2027-06-01') },
  { name: 'Gold Standard 100% Whey', sku: 'ON-WP-004', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Cookies & Cream', purchasePrice: 42.00, sellingPrice: 69.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-06-01') },
  { name: 'Gold Standard 100% Whey', sku: 'ON-WP-005', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Mocha Cappuccino', purchasePrice: 42.00, sellingPrice: 69.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-06-01') },
  { name: 'Gold Standard 100% Whey 5lb', sku: 'ON-WP-006', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Double Rich Chocolate', purchasePrice: 52.00, sellingPrice: 84.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-06-01') },
  { name: 'Gold Standard 100% Whey 5lb', sku: 'ON-WP-007', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Vanilla Ice Cream', purchasePrice: 52.00, sellingPrice: 84.99, quantity: 38, minStock: 12, expiryDate: new Date('2027-06-01') },
  { name: 'Hydro Whey Isolate', sku: 'ON-WI-001', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Chocolate', purchasePrice: 55.00, sellingPrice: 89.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-03-15') },
  { name: 'Whey Isolate', sku: 'DM-WI-001', category: 'Whey Protein', brand: 'Dymatize', flavor: 'Gourmet Chocolate', purchasePrice: 48.00, sellingPrice: 79.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-04-15') },
  { name: 'Whey Isolate', sku: 'DM-WI-002', category: 'Whey Protein', brand: 'Dymatize', flavor: 'Vanilla', purchasePrice: 48.00, sellingPrice: 79.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-04-15') },
  { name: 'Elite Whey', sku: 'DM-EW-001', category: 'Whey Protein', brand: 'Dymatize', flavor: 'Chocolate Peanut Butter', purchasePrice: 35.00, sellingPrice: 57.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-06-01') },
  { name: 'ISO100 Hydrolyzed', sku: 'DM-ISO-001', category: 'Whey Protein', brand: 'Dymatize', flavor: 'Fruity Pebbles', purchasePrice: 50.00, sellingPrice: 82.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-05-01') },
  { name: 'ISO100 Hydrolyzed', sku: 'DM-ISO-002', category: 'Whey Protein', brand: 'Dymatize', flavor: 'Chocolate Cake', purchasePrice: 50.00, sellingPrice: 82.99, quantity: 30, minStock: 8, expiryDate: new Date('2027-05-01') },
  { name: 'Gold Standard Casein', sku: 'ON-CS-001', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Chocolate', purchasePrice: 40.00, sellingPrice: 64.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-05-01') },
  { name: 'NitroTech Whey Gold', sku: 'MT-WG-001', category: 'Whey Protein', brand: 'MuscleTech', flavor: 'Milk Chocolate', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-02-28') },
  { name: 'NitroTech Whey Gold', sku: 'MT-WG-002', category: 'Whey Protein', brand: 'MuscleTech', flavor: 'Vanilla', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-02-28') },
  { name: 'NitroTech 100% Whey', sku: 'MT-WP-002', category: 'Whey Protein', brand: 'MuscleTech', flavor: 'French Vanilla Cream', purchasePrice: 36.00, sellingPrice: 59.99, quantity: 38, minStock: 10, expiryDate: new Date('2027-05-01') },
  { name: 'Ghost Whey', sku: 'GHO-WP-001', category: 'Whey Protein', brand: 'Ghost', flavor: 'Cereal Milk', purchasePrice: 44.00, sellingPrice: 72.99, quantity: 30, minStock: 8, expiryDate: new Date('2027-07-01') },
  { name: 'Ghost Whey', sku: 'GHO-WP-002', category: 'Whey Protein', brand: 'Ghost', flavor: 'Cookies & Cream', purchasePrice: 44.00, sellingPrice: 72.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-07-01') },
  { name: 'Ghost Whey', sku: 'GHO-WP-003', category: 'Whey Protein', brand: 'Ghost', flavor: 'Chocolate Cereal Milk', purchasePrice: 44.00, sellingPrice: 72.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-07-01') },
  { name: 'Gold Standard Whey', sku: 'TL-WP-001', category: 'Whey Protein', brand: 'Transparent Labs', flavor: 'Chocolate Peanut Butter', purchasePrice: 46.00, sellingPrice: 74.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-08-01') },
  { name: 'Whey Protein Isolate', sku: 'TL-WI-001', category: 'Whey Protein', brand: 'Transparent Labs', flavor: 'Strawberry Milkshake', purchasePrice: 50.00, sellingPrice: 79.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-08-01') },
  { name: 'Whey Protein', sku: 'LG-WP-001', category: 'Whey Protein', brand: 'Legion', flavor: 'Chocolate', purchasePrice: 40.00, sellingPrice: 64.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-06-15') },
  { name: 'Whey Protein', sku: 'LG-WP-002', category: 'Whey Protein', brand: 'Legion', flavor: 'Vanilla', purchasePrice: 40.00, sellingPrice: 64.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-06-15') },
  { name: 'Syntha-6', sku: 'BSN-S6-001', category: 'Whey Protein', brand: 'BSN', flavor: 'Chocolate Milkshake', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-04-01') },
  { name: 'Syntha-6', sku: 'BSN-S6-002', category: 'Whey Protein', brand: 'BSN', flavor: 'Cookies & Cream', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-04-01') },
  { name: 'R1 Whey Protein', sku: 'R1-WP-001', category: 'Whey Protein', brand: 'Rule One Proteins', flavor: 'Chocolate Fudge', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-07-01') },
  { name: 'R1 Whey Protein', sku: 'R1-WP-002', category: 'Whey Protein', brand: 'Rule One Proteins', flavor: 'Vanilla Ice Cream', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 32, minStock: 10, expiryDate: new Date('2027-07-01') },
  { name: 'Impact Whey Protein', sku: 'MP-WP-001', category: 'Whey Protein', brand: 'Myprotein', flavor: 'Chocolate', purchasePrice: 28.00, sellingPrice: 49.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-09-01') },
  { name: 'Impact Whey Protein', sku: 'MP-WP-002', category: 'Whey Protein', brand: 'Myprotein', flavor: 'Strawberry Cream', purchasePrice: 28.00, sellingPrice: 49.99, quantity: 45, minStock: 15, expiryDate: new Date('2027-09-01') },
  { name: 'Impact Whey Protein', sku: 'MP-WP-003', category: 'Whey Protein', brand: 'Myprotein', flavor: 'Banana', purchasePrice: 28.00, sellingPrice: 49.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-09-01') },
  { name: 'Whey Protein', sku: 'NK-WP-001', category: 'Whey Protein', brand: 'Naked Nutrition', flavor: 'Chocolate', purchasePrice: 40.00, sellingPrice: 64.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-10-01') },
  { name: 'Whey Protein', sku: 'NK-WP-002', category: 'Whey Protein', brand: 'Naked Nutrition', flavor: 'Vanilla', purchasePrice: 40.00, sellingPrice: 64.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-10-01') },
  { name: 'Ascent Native Fuel Whey', sku: 'ASC-WP-001', category: 'Whey Protein', brand: 'Ascent', flavor: 'Chocolate', purchasePrice: 36.00, sellingPrice: 59.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-08-15') },
  { name: 'Ascent Native Fuel Whey', sku: 'ASC-WP-002', category: 'Whey Protein', brand: 'Ascent', flavor: 'Vanilla', purchasePrice: 36.00, sellingPrice: 59.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-08-15') },
  { name: 'Whoop Fuel Whey', sku: 'JF-WP-001', category: 'Whey Protein', brand: 'Jocko Fuel', flavor: 'Chocolate', purchasePrice: 42.00, sellingPrice: 69.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-07-15') },
  { name: 'Six Star Pro Whey', sku: 'SS-WP-001', category: 'Whey Protein', brand: 'Six Star', flavor: 'Chocolate', purchasePrice: 20.00, sellingPrice: 34.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-11-01') },
  { name: 'Six Star Pro Whey', sku: 'SS-WP-002', category: 'Whey Protein', brand: 'Six Star', flavor: 'Vanilla', purchasePrice: 20.00, sellingPrice: 34.99, quantity: 45, minStock: 12, expiryDate: new Date('2027-11-01') },
  { name: 'Body Fortress Whey', sku: 'BF-WP-001', category: 'Whey Protein', brand: 'Body Fortress', flavor: 'Chocolate', purchasePrice: 22.00, sellingPrice: 38.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-08-01') },
  { name: 'Premier Protein Shake', sku: 'PP-SK-001', category: 'Whey Protein', brand: 'Premier Protein', flavor: 'Chocolate', purchasePrice: 18.00, sellingPrice: 32.99, quantity: 60, minStock: 20, expiryDate: new Date('2027-06-01') },
  { name: 'Premier Protein Shake', sku: 'PP-SK-002', category: 'Whey Protein', brand: 'Premier Protein', flavor: 'Vanilla', purchasePrice: 18.00, sellingPrice: 32.99, quantity: 55, minStock: 18, expiryDate: new Date('2027-06-01') },
  { name: 'Premier Protein Shake', sku: 'PP-SK-003', category: 'Whey Protein', brand: 'Premier Protein', flavor: 'Strawberry', purchasePrice: 18.00, sellingPrice: 32.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-06-01') },
  { name: 'Levels Grass Fed Whey', sku: 'LV-WP-001', category: 'Whey Protein', brand: 'Levels', flavor: 'Chocolate Peanut Butter', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-09-15') },
  { name: 'FlavCity Whey Isolate', sku: 'FC-WI-001', category: 'Whey Protein', brand: 'FlavCity', flavor: 'Chocolate', purchasePrice: 42.00, sellingPrice: 68.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-10-01') },
  { name: 'Whey Protein', sku: 'NP-WP-001', category: 'Whey Protein', brand: 'Nutricost', flavor: 'Chocolate', purchasePrice: 25.00, sellingPrice: 44.99, quantity: 35, minStock: 10, expiryDate: new Date('2028-01-01') },
  { name: 'Whey Protein', sku: 'NP-WP-002', category: 'Whey Protein', brand: 'Nutricost', flavor: 'Vanilla', purchasePrice: 25.00, sellingPrice: 44.99, quantity: 30, minStock: 10, expiryDate: new Date('2028-01-01') },
  { name: 'Whey Protein', sku: 'BPN-WP-001', category: 'Whey Protein', brand: 'Bare Performance Nutrition', flavor: 'Chocolate', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-08-15') },
  { name: 'Whey Strong', sku: 'GNC-WP-001', category: 'Whey Protein', brand: 'GNC', flavor: 'Chocolate', purchasePrice: 32.00, sellingPrice: 54.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-03-01') },

  // ═══════════════════════════════════════════════════════════════
  // PLANT PROTEIN (10 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Organic Plant Protein', sku: 'OG-PP-001', category: 'Plant Protein', brand: 'Orgain', flavor: 'Chocolate', purchasePrice: 30.00, sellingPrice: 49.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-09-01') },
  { name: 'Organic Plant Protein', sku: 'OG-PP-002', category: 'Plant Protein', brand: 'Orgain', flavor: 'Vanilla Bean', purchasePrice: 30.00, sellingPrice: 49.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-09-01') },
  { name: 'Plant Protein', sku: 'TL-PP-001', category: 'Plant Protein', brand: 'Transparent Labs', flavor: 'Chocolate', purchasePrice: 42.00, sellingPrice: 69.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-11-01') },
  { name: 'Plant Protein', sku: 'TL-PP-002', category: 'Plant Protein', brand: 'Transparent Labs', flavor: 'Vanilla', purchasePrice: 42.00, sellingPrice: 69.99, quantity: 18, minStock: 6, expiryDate: new Date('2027-11-01') },
  { name: 'Organic Protein', sku: 'GOL-PP-001', category: 'Plant Protein', brand: 'Garden of Life', flavor: 'Chocolate', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-08-15') },
  { name: 'Organic Protein', sku: 'GOL-PP-002', category: 'Plant Protein', brand: 'Garden of Life', flavor: 'Vanilla', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-08-15') },
  { name: 'Vega Sport Protein', sku: 'VG-PP-001', category: 'Plant Protein', brand: 'Vega', flavor: 'Chocolate', purchasePrice: 36.00, sellingPrice: 59.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-07-01') },
  { name: 'Vega Protein Greens', sku: 'VG-PP-002', category: 'Plant Protein', brand: 'Vega', flavor: 'Berry', purchasePrice: 34.00, sellingPrice: 56.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-07-01') },
  { name: 'Plant Protein Complex', sku: 'NOW-PP-001', category: 'Plant Protein', brand: 'NOW Sports', flavor: 'Chocolate', purchasePrice: 28.00, sellingPrice: 47.99, quantity: 30, minStock: 10, expiryDate: new Date('2028-02-01') },
  { name: 'Naked Pea Protein', sku: 'NK-PP-001', category: 'Plant Protein', brand: 'Naked Nutrition', flavor: 'Unflavored', purchasePrice: 35.00, sellingPrice: 57.99, quantity: 20, minStock: 6, expiryDate: new Date('2028-03-01') },

  // ═══════════════════════════════════════════════════════════════
  // PRE-WORKOUT (28 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'C4 Original', sku: 'CEL-PW-001', category: 'Pre-Workout', brand: 'Cellucor', flavor: 'Blue Raspberry', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-08-01') },
  { name: 'C4 Original', sku: 'CEL-PW-002', category: 'Pre-Workout', brand: 'Cellucor', flavor: 'Fruit Punch', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 45, minStock: 12, expiryDate: new Date('2027-08-01') },
  { name: 'C4 Original', sku: 'CEL-PW-003', category: 'Pre-Workout', brand: 'Cellucor', flavor: 'Watermelon', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-08-01') },
  { name: 'C4 Ultimate', sku: 'CEL-PW-004', category: 'Pre-Workout', brand: 'Cellucor', flavor: 'Sour Watermelon', purchasePrice: 28.00, sellingPrice: 49.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-07-15') },
  { name: 'C4 Ultimate', sku: 'CEL-PW-005', category: 'Pre-Workout', brand: 'Cellucor', flavor: 'Blue Raspberry', purchasePrice: 28.00, sellingPrice: 49.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-07-15') },
  { name: 'C4 Sport', sku: 'CEL-PW-006', category: 'Pre-Workout', brand: 'Cellucor', flavor: 'Fruit Punch', purchasePrice: 14.00, sellingPrice: 26.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-09-01') },
  { name: 'C4 Ripped', sku: 'CEL-PW-007', category: 'Pre-Workout', brand: 'Cellucor', flavor: 'Cherry Limeade', purchasePrice: 22.00, sellingPrice: 42.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-06-15') },
  { name: 'Ghost Legend V4', sku: 'GHO-PW-001', category: 'Pre-Workout', brand: 'Ghost', flavor: 'Sour Watermelon', purchasePrice: 26.00, sellingPrice: 44.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-05-01') },
  { name: 'Ghost Legend V4', sku: 'GHO-PW-002', category: 'Pre-Workout', brand: 'Ghost', flavor: 'Blue Raspberry', purchasePrice: 26.00, sellingPrice: 44.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-05-01') },
  { name: 'Ghost Legend V4', sku: 'GHO-PW-003', category: 'Pre-Workout', brand: 'Ghost', flavor: 'Fruit Punch', purchasePrice: 26.00, sellingPrice: 44.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-05-01') },
  { name: 'Ghost Pump', sku: 'GHO-PW-004', category: 'Pre-Workout', brand: 'Ghost', flavor: 'Lemon Drop', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-06-01') },
  { name: 'True Pump', sku: 'TL-PW-001', category: 'Pre-Workout', brand: 'Transparent Labs', flavor: 'Pineapple', purchasePrice: 24.00, sellingPrice: 44.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-09-15') },
  { name: 'Bulk Pre-Workout', sku: 'TL-PW-002', category: 'Pre-Workout', brand: 'Transparent Labs', flavor: 'Tropical Punch', purchasePrice: 26.00, sellingPrice: 49.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-09-15') },
  { name: 'Bulk Pre-Workout', sku: 'TL-PW-003', category: 'Pre-Workout', brand: 'Transparent Labs', flavor: 'Blue Raspberry', purchasePrice: 26.00, sellingPrice: 49.99, quantity: 18, minStock: 6, expiryDate: new Date('2027-09-15') },
  { name: 'Pulse Pre-Workout', sku: 'LG-PW-001', category: 'Pre-Workout', brand: 'Legion', flavor: 'Fruit Punch', purchasePrice: 22.00, sellingPrice: 42.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-07-01') },
  { name: 'Pulse Pre-Workout', sku: 'LG-PW-002', category: 'Pre-Workout', brand: 'Legion', flavor: 'Blue Raspberry', purchasePrice: 22.00, sellingPrice: 42.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-07-01') },
  { name: 'Nitrosurge Pre-Workout', sku: 'JF-PW-001', category: 'Pre-Workout', brand: 'Jacked Factory', flavor: 'Cherry Limeade', purchasePrice: 15.00, sellingPrice: 29.99, quantity: 35, minStock: 12, expiryDate: new Date('2027-10-01') },
  { name: 'Nitrosurge Pre-Workout', sku: 'JF-PW-002', category: 'Pre-Workout', brand: 'Jacked Factory', flavor: 'Blue Raspberry', purchasePrice: 15.00, sellingPrice: 29.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-10-01') },
  { name: 'Gorilla Mode', sku: 'GM-PW-001', category: 'Pre-Workout', brand: 'Gorilla Mind', flavor: 'Fruit Punch', purchasePrice: 25.00, sellingPrice: 49.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-08-15') },
  { name: 'Gorilla Mode', sku: 'GM-PW-002', category: 'Pre-Workout', brand: 'Gorilla Mind', flavor: 'Tropical Punch', purchasePrice: 25.00, sellingPrice: 49.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-08-15') },
  { name: 'NO-XPLODE', sku: 'BSN-PW-001', category: 'Pre-Workout', brand: 'BSN', flavor: 'Blue Razz', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 28, minStock: 10, expiryDate: new Date('2027-05-15') },
  { name: 'N.O.-XPLODE 2.0', sku: 'BSN-PW-002', category: 'Pre-Workout', brand: 'BSN', flavor: 'Fruit Punch', purchasePrice: 19.00, sellingPrice: 34.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-06-01') },
  { name: 'Ryse Rage Pre-Workout', sku: 'RY-PW-001', category: 'Pre-Workout', brand: 'Ryse', flavor: 'Cotton Candy', purchasePrice: 20.00, sellingPrice: 38.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-09-01') },
  { name: 'Ryse Rage Pre-Workout', sku: 'RY-PW-002', category: 'Pre-Workout', brand: 'Ryse', flavor: 'Peach Mango', purchasePrice: 20.00, sellingPrice: 38.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-09-01') },
  { name: 'Wrecked Pre-Workout', sku: 'NB-PW-001', category: 'Pre-Workout', brand: 'Nutricost', flavor: 'Sour Watermelon', purchasePrice: 13.00, sellingPrice: 26.99, quantity: 40, minStock: 12, expiryDate: new Date('2028-01-01') },
  { name: 'Ignition Mode', sku: 'KG-PW-001', category: 'Pre-Workout', brand: 'Kaged', flavor: 'Strawberry', purchasePrice: 22.00, sellingPrice: 42.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-10-15') },
  { name: 'Prizefighter Pre-Workout', sku: '1P-PW-001', category: 'Pre-Workout', brand: '1st Phorm', flavor: 'Tropical Punch', purchasePrice: 24.00, sellingPrice: 44.99, quantity: 18, minStock: 6, expiryDate: new Date('2027-08-01') },
  { name: 'Animal Pump', sku: 'AN-PW-001', category: 'Pre-Workout', brand: 'Animal', flavor: 'Unflavored', purchasePrice: 20.00, sellingPrice: 38.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-07-15') },
  { name: 'Raw Pre-Workout', sku: 'RN-PW-001', category: 'Pre-Workout', brand: 'Raw Nutrition', flavor: 'Watermelon', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-09-15') },

  // ═══════════════════════════════════════════════════════════════
  // CREATINE (18 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Micronized Creatine Powder', sku: 'ON-CR-001', category: 'Creatine', brand: 'Optimum Nutrition', flavor: 'Unflavored', purchasePrice: 11.00, sellingPrice: 21.99, quantity: 80, minStock: 25, expiryDate: new Date('2028-06-01') },
  { name: 'Creatine HCL', sku: 'CEL-CR-001', category: 'Creatine', brand: 'Cellucor', flavor: 'Unflavored', purchasePrice: 16.00, sellingPrice: 29.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-12-01') },
  { name: 'Creatine Monohydrate', sku: 'BSN-CR-001', category: 'Creatine', brand: 'BSN', flavor: 'Unflavored', purchasePrice: 10.00, sellingPrice: 19.99, quantity: 55, minStock: 15, expiryDate: new Date('2028-03-01') },
  { name: 'Creatine Monohydrate Micronized', sku: 'NOW-CR-001', category: 'Creatine', brand: 'NOW Sports', flavor: 'Unflavored', purchasePrice: 9.00, sellingPrice: 17.99, quantity: 60, minStock: 15, expiryDate: new Date('2028-01-15') },
  { name: 'HCL Creatine Capsules', sku: 'MT-CR-002', category: 'Creatine', brand: 'MuscleTech', flavor: 'Unflavored', purchasePrice: 13.00, sellingPrice: 24.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-11-01') },
  { name: 'Platinum 100% Creatine', sku: 'MT-CR-003', category: 'Creatine', brand: 'MuscleTech', flavor: 'Unflavored', purchasePrice: 10.00, sellingPrice: 19.99, quantity: 70, minStock: 20, expiryDate: new Date('2028-01-01') },
  { name: 'Cell-Tech Creatine', sku: 'MT-CT-001', category: 'Creatine', brand: 'MuscleTech', flavor: 'Fruit Punch', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-03-01') },
  { name: 'Creatine Monohydrate', sku: 'TL-CR-001', category: 'Creatine', brand: 'Transparent Labs', flavor: 'Unflavored', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 30, minStock: 10, expiryDate: new Date('2028-04-01') },
  { name: 'Creatine Monohydrate', sku: 'TH-CR-001', category: 'Creatine', brand: 'Thorne', flavor: 'Unflavored', purchasePrice: 15.00, sellingPrice: 29.99, quantity: 25, minStock: 8, expiryDate: new Date('2028-05-01') },
  { name: 'Creatine Monohydrate', sku: 'NP-CR-001', category: 'Creatine', brand: 'Nutricost', flavor: 'Unflavored', purchasePrice: 8.00, sellingPrice: 18.99, quantity: 65, minStock: 20, expiryDate: new Date('2028-02-01') },
  { name: 'Creatine Monohydrate', sku: 'BS-CR-001', category: 'Creatine', brand: 'BulkSupplements', flavor: 'Unflavored', purchasePrice: 8.50, sellingPrice: 18.99, quantity: 70, minStock: 20, expiryDate: new Date('2028-03-01') },
  { name: 'Naked Creatine', sku: 'NK-CR-001', category: 'Creatine', brand: 'Naked Nutrition', flavor: 'Unflavored', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 25, minStock: 8, expiryDate: new Date('2028-06-01') },
  { name: 'Momentous Creatine', sku: 'MTM-CR-001', category: 'Creatine', brand: 'Momentous', flavor: 'Unflavored', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 20, minStock: 6, expiryDate: new Date('2028-04-01') },
  { name: 'Creatine Monohydrate', sku: 'JF-CR-001', category: 'Creatine', brand: 'Jacked Factory', flavor: 'Unflavored', purchasePrice: 10.00, sellingPrice: 21.99, quantity: 35, minStock: 10, expiryDate: new Date('2028-02-15') },
  { name: 'Raw Creatine', sku: 'RN-CR-001', category: 'Creatine', brand: 'Raw Nutrition', flavor: 'Unflavored', purchasePrice: 11.00, sellingPrice: 22.99, quantity: 28, minStock: 8, expiryDate: new Date('2028-03-15') },
  { name: 'Monopure Creatine', sku: 'JCK-CR-001', category: 'Creatine', brand: 'Jocko Fuel', flavor: 'Unflavored', purchasePrice: 13.00, sellingPrice: 24.99, quantity: 22, minStock: 6, expiryDate: new Date('2028-05-01') },
  { name: 'Animal Creatine', sku: 'AN-CR-001', category: 'Creatine', brand: 'Animal', flavor: 'Unflavored', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 30, minStock: 10, expiryDate: new Date('2028-01-01') },
  { name: 'Creatine Monohydrate Gummies', sku: 'CEL-CR-002', category: 'Creatine', brand: 'Cellucor', flavor: 'Tropical Punch', purchasePrice: 15.00, sellingPrice: 29.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-12-15') },

  // ═══════════════════════════════════════════════════════════════
  // BCAA & AMINO ACIDS (12 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'BCAA Powder', sku: 'GHO-AA-001', category: 'BCAA & Amino Acids', brand: 'Ghost', flavor: 'Sour Patch Kids', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-05-15') },
  { name: 'BCAA Powder', sku: 'GHO-AA-002', category: 'BCAA & Amino Acids', brand: 'Ghost', flavor: 'Swedish Fish', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-05-15') },
  { name: 'Amino X', sku: 'BSN-AA-001', category: 'BCAA & Amino Acids', brand: 'BSN', flavor: 'Blue Raspberry', purchasePrice: 16.00, sellingPrice: 29.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-04-01') },
  { name: 'Amino X', sku: 'BSN-AA-002', category: 'BCAA & Amino Acids', brand: 'BSN', flavor: 'Fruit Punch', purchasePrice: 16.00, sellingPrice: 29.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-04-01') },
  { name: 'EAA Complex', sku: 'ON-AA-001', category: 'BCAA & Amino Acids', brand: 'Optimum Nutrition', flavor: 'Fruit Punch', purchasePrice: 17.00, sellingPrice: 32.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-06-20') },
  { name: 'BCAA 1000 Caps', sku: 'ON-AA-002', category: 'BCAA & Amino Acids', brand: 'Optimum Nutrition', flavor: 'Unflavored', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 40, minStock: 10, expiryDate: new Date('2027-07-01') },
  { name: 'Amino Energy', sku: 'ON-AA-003', category: 'BCAA & Amino Acids', brand: 'Optimum Nutrition', flavor: 'Blue Raspberry', purchasePrice: 13.00, sellingPrice: 25.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-08-15') },
  { name: 'Xtend Original BCAA', sku: 'XT-AA-001', category: 'BCAA & Amino Acids', brand: 'Xtend', flavor: 'Blue Raspberry Ice', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-06-01') },
  { name: 'Xtend Original BCAA', sku: 'XT-AA-002', category: 'BCAA & Amino Acids', brand: 'Xtend', flavor: 'Watermelon Explosion', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-06-01') },
  { name: 'BCAA Powder 2:1:1', sku: 'DM-AA-001', category: 'BCAA & Amino Acids', brand: 'Dymatize', flavor: 'Blue Raspberry', purchasePrice: 15.00, sellingPrice: 29.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-04-01') },
  { name: 'EAA & BCAA Powder', sku: 'EV-AA-001', category: 'BCAA & Amino Acids', brand: 'Evlution Nutrition', flavor: 'Fruit Punch', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-07-15') },
  { name: 'Intra-Workout BCAA', sku: 'KG-AA-001', category: 'BCAA & Amino Acids', brand: 'Kaged', flavor: 'Strawberry Lemonade', purchasePrice: 16.00, sellingPrice: 32.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-09-01') },

  // ═══════════════════════════════════════════════════════════════
  // MASS GAINER (10 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Serious Mass', sku: 'ON-MG-001', category: 'Mass Gainer', brand: 'Optimum Nutrition', flavor: 'Vanilla', purchasePrice: 32.00, sellingPrice: 54.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-01-20') },
  { name: 'Serious Mass', sku: 'ON-MG-002', category: 'Mass Gainer', brand: 'Optimum Nutrition', flavor: 'Chocolate', purchasePrice: 32.00, sellingPrice: 54.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-01-20') },
  { name: 'True-Mass 1200', sku: 'BSN-MG-001', category: 'Mass Gainer', brand: 'BSN', flavor: 'Cookies & Cream', purchasePrice: 30.00, sellingPrice: 52.99, quantity: 20, minStock: 8, expiryDate: new Date('2027-03-01') },
  { name: 'True-Mass 1200', sku: 'BSN-MG-002', category: 'Mass Gainer', brand: 'BSN', flavor: 'Vanilla', purchasePrice: 30.00, sellingPrice: 52.99, quantity: 18, minStock: 6, expiryDate: new Date('2027-03-01') },
  { name: 'Super Mass Gainer', sku: 'DM-MG-001', category: 'Mass Gainer', brand: 'Dymatize', flavor: 'Chocolate', purchasePrice: 28.00, sellingPrice: 49.99, quantity: 18, minStock: 8, expiryDate: new Date('2027-02-15') },
  { name: 'Super Mass Gainer', sku: 'DM-MG-002', category: 'Mass Gainer', brand: 'Dymatize', flavor: 'Vanilla', purchasePrice: 28.00, sellingPrice: 49.99, quantity: 15, minStock: 6, expiryDate: new Date('2027-02-15') },
  { name: 'NitroTech Mass', sku: 'MT-MG-001', category: 'Mass Gainer', brand: 'MuscleTech', flavor: 'Chocolate', purchasePrice: 30.00, sellingPrice: 49.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-01-15') },
  { name: 'True Gainer', sku: 'UN-MG-001', category: 'Mass Gainer', brand: 'Universal Nutrition', flavor: 'Chocolate', purchasePrice: 26.00, sellingPrice: 46.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-04-01') },
  { name: 'R1 Gainer', sku: 'R1-MG-001', category: 'Mass Gainer', brand: 'Rule One Proteins', flavor: 'Chocolate', purchasePrice: 32.00, sellingPrice: 54.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-05-15') },
  { name: 'Naked Mass', sku: 'NK-MG-001', category: 'Mass Gainer', brand: 'Naked Nutrition', flavor: 'Chocolate', purchasePrice: 34.00, sellingPrice: 57.99, quantity: 15, minStock: 6, expiryDate: new Date('2027-09-01') },

  // ═══════════════════════════════════════════════════════════════
  // FAT BURNER (10 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Hydroxycut Hardcore Elite', sku: 'MT-FB-001', category: 'Fat Burner', brand: 'MuscleTech', flavor: null, purchasePrice: 15.00, sellingPrice: 29.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-06-15') },
  { name: 'Hydroxycut Hardcore Elite', sku: 'MT-FB-002', category: 'Fat Burner', brand: 'MuscleTech', flavor: null, purchasePrice: 15.00, sellingPrice: 29.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-06-01') },
  { name: 'LeanMode Stim-Free', sku: 'EV-FB-001', category: 'Fat Burner', brand: 'Evlution Nutrition', flavor: null, purchasePrice: 12.00, sellingPrice: 24.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-05-01') },
  { name: 'L-Carnitine 1000mg', sku: 'NOW-FB-001', category: 'Fat Burner', brand: 'NOW Sports', flavor: null, purchasePrice: 8.00, sellingPrice: 16.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-08-01') },
  { name: 'Shred Matrix', sku: 'BSN-FB-001', category: 'Fat Burner', brand: 'BSN', flavor: null, purchasePrice: 16.00, sellingPrice: 31.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-04-15') },
  { name: 'CLA 1000mg Softgels', sku: 'ON-FB-001', category: 'Fat Burner', brand: 'Optimum Nutrition', flavor: null, purchasePrice: 10.00, sellingPrice: 21.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-09-01') },
  { name: 'Nitrosurge Shred', sku: 'JF-FB-001', category: 'Fat Burner', brand: 'Jacked Factory', flavor: 'Cherry Limeade', purchasePrice: 14.00, sellingPrice: 28.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-10-01') },
  { name: 'Burn PM', sku: 'TL-FB-001', category: 'Fat Burner', brand: 'Transparent Labs', flavor: null, purchasePrice: 16.00, sellingPrice: 34.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-11-01') },
  { name: 'Fat Burner', sku: 'NP-FB-001', category: 'Fat Burner', brand: 'Nutricost', flavor: null, purchasePrice: 10.00, sellingPrice: 21.99, quantity: 30, minStock: 10, expiryDate: new Date('2028-01-01') },
  { name: 'Green Tea Extract', sku: 'NOW-FB-002', category: 'Fat Burner', brand: 'NOW Foods', flavor: null, purchasePrice: 7.00, sellingPrice: 14.99, quantity: 35, minStock: 10, expiryDate: new Date('2028-02-01') },

  // ═══════════════════════════════════════════════════════════════
  // VITAMINS & MINERALS (18 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Vitamin D3 5000 IU', sku: 'NOW-VD-001', category: 'Vitamins & Minerals', brand: 'NOW Foods', flavor: null, purchasePrice: 6.00, sellingPrice: 12.99, quantity: 70, minStock: 20, expiryDate: new Date('2028-03-01') },
  { name: 'Vitamin C 1000mg', sku: 'NM-VC-001', category: 'Vitamins & Minerals', brand: 'Nature Made', flavor: null, purchasePrice: 5.00, sellingPrice: 11.99, quantity: 80, minStock: 25, expiryDate: new Date('2028-06-01') },
  { name: 'Zinc 50mg', sku: 'NOW-ZN-001', category: 'Vitamins & Minerals', brand: 'NOW Foods', flavor: null, purchasePrice: 4.00, sellingPrice: 8.99, quantity: 65, minStock: 20, expiryDate: new Date('2028-04-01') },
  { name: 'Opti-Men Daily Formula', sku: 'ON-MV-001', category: 'Vitamins & Minerals', brand: 'Optimum Nutrition', flavor: null, purchasePrice: 14.00, sellingPrice: 27.99, quantity: 45, minStock: 15, expiryDate: new Date('2027-09-01') },
  { name: 'Opti-Women Daily Formula', sku: 'ON-MV-002', category: 'Vitamins & Minerals', brand: 'Optimum Nutrition', flavor: null, purchasePrice: 14.00, sellingPrice: 27.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-08-15') },
  { name: 'Animal Pak Multi', sku: 'UN-MV-001', category: 'Vitamins & Minerals', brand: 'Universal Nutrition', flavor: null, purchasePrice: 16.00, sellingPrice: 32.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-11-01') },
  { name: 'Daily One Multivitamin', sku: 'NOW-MV-001', category: 'Vitamins & Minerals', brand: 'NOW Foods', flavor: null, purchasePrice: 8.00, sellingPrice: 16.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-10-01') },
  { name: 'Mega Men Sport Multi', sku: 'GNC-MV-001', category: 'Vitamins & Minerals', brand: 'GNC', flavor: null, purchasePrice: 12.00, sellingPrice: 24.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-12-15') },
  { name: 'Vitamin K2 100mcg', sku: 'NOW-VK-001', category: 'Vitamins & Minerals', brand: 'NOW Foods', flavor: null, purchasePrice: 6.50, sellingPrice: 13.99, quantity: 40, minStock: 12, expiryDate: new Date('2028-01-01') },
  { name: 'Magnesium Glycinate 400mg', sku: 'NOW-MG-001', category: 'Vitamins & Minerals', brand: 'NOW Foods', flavor: null, purchasePrice: 8.00, sellingPrice: 16.99, quantity: 45, minStock: 12, expiryDate: new Date('2028-03-15') },
  { name: 'B-Complex', sku: 'NM-BC-001', category: 'Vitamins & Minerals', brand: 'Nature Made', flavor: null, purchasePrice: 5.50, sellingPrice: 11.99, quantity: 55, minStock: 15, expiryDate: new Date('2028-05-01') },
  { name: 'Vitamin B12 1000mcg', sku: 'NOW-B12-001', category: 'Vitamins & Minerals', brand: 'NOW Foods', flavor: null, purchasePrice: 5.00, sellingPrice: 10.99, quantity: 60, minStock: 18, expiryDate: new Date('2028-04-01') },
  { name: 'Iron 18mg', sku: 'NOW-FE-001', category: 'Vitamins & Minerals', brand: 'NOW Foods', flavor: null, purchasePrice: 4.50, sellingPrice: 9.99, quantity: 45, minStock: 12, expiryDate: new Date('2028-02-01') },
  { name: 'Multi for Her', sku: 'GOL-MV-001', category: 'Vitamins & Minerals', brand: 'Garden of Life', flavor: null, purchasePrice: 15.00, sellingPrice: 29.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-12-01') },
  { name: 'Basic Nutrients', sku: 'TH-MV-001', category: 'Vitamins & Minerals', brand: 'Thorne', flavor: null, purchasePrice: 14.00, sellingPrice: 27.99, quantity: 20, minStock: 6, expiryDate: new Date('2028-01-15') },
  { name: 'Life Extension Two-Per-Day', sku: 'LE-MV-001', category: 'Vitamins & Minerals', brand: 'Life Extension', flavor: null, purchasePrice: 10.00, sellingPrice: 21.99, quantity: 30, minStock: 10, expiryDate: new Date('2028-03-01') },
  { name: 'ZMA Pro', sku: 'ON-ZM-001', category: 'Vitamins & Minerals', brand: 'Optimum Nutrition', flavor: null, purchasePrice: 9.00, sellingPrice: 18.99, quantity: 40, minStock: 12, expiryDate: new Date('2028-02-01') },
  { name: 'ZMA Recovery', sku: 'NOW-ZM-001', category: 'Vitamins & Minerals', brand: 'NOW Sports', flavor: null, purchasePrice: 7.00, sellingPrice: 15.99, quantity: 55, minStock: 15, expiryDate: new Date('2028-01-01') },

  // ═══════════════════════════════════════════════════════════════
  // FISH OIL & OMEGA (6 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Fish Oil Omega-3', sku: 'ON-FO-001', category: 'Fish Oil & Omega', brand: 'Optimum Nutrition', flavor: null, purchasePrice: 13.00, sellingPrice: 24.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-08-01') },
  { name: 'Ultimate Omega', sku: 'NN-FO-001', category: 'Fish Oil & Omega', brand: 'Nordic Naturals', flavor: null, purchasePrice: 18.00, sellingPrice: 34.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-06-15') },
  { name: 'CoQ10 100mg', sku: 'NOW-CQ-001', category: 'Fish Oil & Omega', brand: 'NOW Foods', flavor: null, purchasePrice: 12.00, sellingPrice: 22.99, quantity: 40, minStock: 10, expiryDate: new Date('2027-12-01') },
  { name: 'Ultra Omega-3', sku: 'LE-FO-001', category: 'Fish Oil & Omega', brand: 'Life Extension', flavor: null, purchasePrice: 14.00, sellingPrice: 27.99, quantity: 30, minStock: 8, expiryDate: new Date('2028-01-01') },
  { name: 'Triple Strength Omega-3', sku: 'SR-FO-001', category: 'Fish Oil & Omega', brand: 'Sports Research', flavor: null, purchasePrice: 16.00, sellingPrice: 31.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-09-01') },
  { name: 'Mega EPA Fish Oil', sku: 'NOW-FO-001', category: 'Fish Oil & Omega', brand: 'NOW Foods', flavor: null, purchasePrice: 10.00, sellingPrice: 21.99, quantity: 35, minStock: 10, expiryDate: new Date('2028-02-01') },

  // ═══════════════════════════════════════════════════════════════
  // JOINT SUPPORT (6 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Joint Support Plus', sku: 'NOW-JS-001', category: 'Joint Support', brand: 'NOW Foods', flavor: null, purchasePrice: 14.00, sellingPrice: 27.99, quantity: 30, minStock: 8, expiryDate: new Date('2027-09-15') },
  { name: 'Glucosamine Chondroitin', sku: 'NM-JS-001', category: 'Joint Support', brand: 'Nature Made', flavor: null, purchasePrice: 11.00, sellingPrice: 22.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-10-01') },
  { name: 'Move Free Ultra', sku: 'MF-JS-001', category: 'Joint Support', brand: 'Move Free', flavor: null, purchasePrice: 14.00, sellingPrice: 27.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-11-01') },
  { name: 'Glucosamine MSM', sku: 'NOW-JS-002', category: 'Joint Support', brand: 'NOW Foods', flavor: null, purchasePrice: 12.00, sellingPrice: 24.99, quantity: 30, minStock: 10, expiryDate: new Date('2028-01-01') },
  { name: 'MSM 1000mg', sku: 'NOW-JS-003', category: 'Joint Support', brand: 'NOW Foods', flavor: null, purchasePrice: 9.00, sellingPrice: 18.99, quantity: 40, minStock: 12, expiryDate: new Date('2028-03-01') },
  { name: 'Joint Complex', sku: 'LE-JS-001', category: 'Joint Support', brand: 'Life Extension', flavor: null, purchasePrice: 13.00, sellingPrice: 26.99, quantity: 22, minStock: 6, expiryDate: new Date('2027-12-15') },

  // ═══════════════════════════════════════════════════════════════
  // PROBIOTICS & DIGESTIVE (6 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Probiotics 50 Billion', sku: 'NOW-PB-001', category: 'Probiotics & Digestive', brand: 'NOW Foods', flavor: null, purchasePrice: 15.00, sellingPrice: 29.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-07-01') },
  { name: 'Dr. Formulated Probiotics', sku: 'GOL-PB-001', category: 'Probiotics & Digestive', brand: 'Garden of Life', flavor: null, purchasePrice: 18.00, sellingPrice: 34.99, quantity: 22, minStock: 6, expiryDate: new Date('2027-08-15') },
  { name: 'Culturelle Probiotic', sku: 'CL-PB-001', category: 'Probiotics & Digestive', brand: 'Culturelle', flavor: null, purchasePrice: 12.00, sellingPrice: 24.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-10-01') },
  { name: 'Align Probiotic', sku: 'AL-PB-001', category: 'Probiotics & Digestive', brand: 'Align', flavor: null, purchasePrice: 14.00, sellingPrice: 28.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-09-01') },
  { name: 'Digestive Enzymes', sku: 'NOW-DE-001', category: 'Probiotics & Digestive', brand: 'NOW Foods', flavor: null, purchasePrice: 10.00, sellingPrice: 21.99, quantity: 35, minStock: 10, expiryDate: new Date('2028-01-15') },
  { name: 'Prebiotic Fiber', sku: 'NOW-PF-001', category: 'Probiotics & Digestive', brand: 'NOW Foods', flavor: null, purchasePrice: 7.00, sellingPrice: 14.99, quantity: 30, minStock: 8, expiryDate: new Date('2027-10-15') },

  // ═══════════════════════════════════════════════════════════════
  // COLLAGEN (6 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Collagen Peptides', sku: 'VL-CP-001', category: 'Collagen', brand: 'Vital Proteins', flavor: 'Unflavored', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-08-01') },
  { name: 'Collagen Peptides', sku: 'VL-CP-002', category: 'Collagen', brand: 'Vital Proteins', flavor: 'Chocolate', purchasePrice: 24.00, sellingPrice: 42.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-08-01') },
  { name: 'Marine Collagen', sku: 'SR-CP-001', category: 'Collagen', brand: 'Sports Research', flavor: 'Unflavored', purchasePrice: 20.00, sellingPrice: 37.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-10-01') },
  { name: 'Collagen Peptides', sku: 'NOW-CP-001', category: 'Collagen', brand: 'NOW Foods', flavor: 'Unflavored', purchasePrice: 16.00, sellingPrice: 32.99, quantity: 28, minStock: 8, expiryDate: new Date('2028-02-01') },
  { name: 'Hydrolyzed Collagen', sku: 'GL-CP-001', category: 'Collagen', brand: 'Great Lakes', flavor: 'Unflavored', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 20, minStock: 6, expiryDate: new Date('2028-03-01') },
  { name: 'Collagen Joint Complex', sku: 'VL-CP-003', category: 'Collagen', brand: 'Vital Proteins', flavor: 'Unflavored', purchasePrice: 25.00, sellingPrice: 44.99, quantity: 18, minStock: 6, expiryDate: new Date('2027-11-01') },

  // ═══════════════════════════════════════════════════════════════
  // SLEEP & RELAXATION (6 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Melatonin 5mg', sku: 'NOW-ML-001', category: 'Sleep & Relaxation', brand: 'NOW Foods', flavor: null, purchasePrice: 4.00, sellingPrice: 9.99, quantity: 60, minStock: 20, expiryDate: new Date('2028-06-01') },
  { name: 'ZMA Night Recovery', sku: 'BSN-ZM-001', category: 'Sleep & Relaxation', brand: 'BSN', flavor: null, purchasePrice: 8.00, sellingPrice: 17.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-11-01') },
  { name: 'GABA 750mg', sku: 'NOW-GA-001', category: 'Sleep & Relaxation', brand: 'NOW Foods', flavor: null, purchasePrice: 6.00, sellingPrice: 12.99, quantity: 30, minStock: 8, expiryDate: new Date('2027-09-15') },
  { name: 'Melatonin 3mg Gummies', sku: 'NM-ML-001', category: 'Sleep & Relaxation', brand: 'Nature Made', flavor: null, purchasePrice: 5.00, sellingPrice: 11.99, quantity: 45, minStock: 15, expiryDate: new Date('2028-01-01') },
  { name: 'Magnesium L-Threonate', sku: 'LE-SL-001', category: 'Sleep & Relaxation', brand: 'Life Extension', flavor: null, purchasePrice: 12.00, sellingPrice: 24.99, quantity: 22, minStock: 6, expiryDate: new Date('2028-03-01') },
  { name: 'Tart Cherry Extract', sku: 'NOW-RC-001', category: 'Sleep & Relaxation', brand: 'NOW Foods', flavor: null, purchasePrice: 9.00, sellingPrice: 18.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-10-01') },

  // ═══════════════════════════════════════════════════════════════
  // TESTOSTERONE & HORMONE (6 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Animal Pak Test', sku: 'UN-TB-001', category: 'Testosterone & Hormone', brand: 'Universal Nutrition', flavor: null, purchasePrice: 18.00, sellingPrice: 34.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-07-01') },
  { name: 'Tribulus 1000mg', sku: 'NOW-TB-001', category: 'Testosterone & Hormone', brand: 'NOW Foods', flavor: null, purchasePrice: 7.00, sellingPrice: 14.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-09-01') },
  { name: 'D-Aspartic Acid', sku: 'NOW-DA-001', category: 'Testosterone & Hormone', brand: 'NOW Foods', flavor: null, purchasePrice: 8.00, sellingPrice: 16.99, quantity: 30, minStock: 10, expiryDate: new Date('2028-01-01') },
  { name: 'Tongkat Ali 600mg', sku: 'NOW-TA-001', category: 'Testosterone & Hormone', brand: 'NOW Foods', flavor: null, purchasePrice: 9.00, sellingPrice: 18.99, quantity: 25, minStock: 8, expiryDate: new Date('2028-02-15') },
  { name: 'Ashwagandha KSM-66', sku: 'NOW-AW-001', category: 'Testosterone & Hormone', brand: 'NOW Foods', flavor: null, purchasePrice: 8.00, sellingPrice: 17.99, quantity: 35, minStock: 10, expiryDate: new Date('2028-01-01') },
  { name: 'Testosterone Booster', sku: 'ON-TB-001', category: 'Testosterone & Hormone', brand: 'Optimum Nutrition', flavor: null, purchasePrice: 12.00, sellingPrice: 24.99, quantity: 22, minStock: 6, expiryDate: new Date('2027-08-15') },

  // ═══════════════════════════════════════════════════════════════
  // HYDRATION & ELECTROLYTES (10 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Hydration Multiplier', sku: 'LM-HY-001', category: 'Hydration & Electrolytes', brand: 'Liquid IV', flavor: 'Lemon Lime', purchasePrice: 8.00, sellingPrice: 16.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-10-15') },
  { name: 'Hydration Multiplier', sku: 'LM-HY-002', category: 'Hydration & Electrolytes', brand: 'Liquid IV', flavor: 'Tropical Punch', purchasePrice: 8.00, sellingPrice: 16.99, quantity: 45, minStock: 12, expiryDate: new Date('2027-10-15') },
  { name: 'Prime Hydration', sku: 'PR-HY-001', category: 'Hydration & Electrolytes', brand: 'Prime', flavor: 'Ice Pop', purchasePrice: 6.00, sellingPrice: 12.99, quantity: 60, minStock: 20, expiryDate: new Date('2027-06-01') },
  { name: 'Prime Hydration', sku: 'PR-HY-002', category: 'Hydration & Electrolytes', brand: 'Prime', flavor: 'Tropical Punch', purchasePrice: 6.00, sellingPrice: 12.99, quantity: 55, minStock: 18, expiryDate: new Date('2027-06-01') },
  { name: 'Gatorade Zero Powder', sku: 'GAT-HY-001', category: 'Hydration & Electrolytes', brand: 'Gatorade', flavor: 'Fruit Punch', purchasePrice: 5.00, sellingPrice: 11.99, quantity: 65, minStock: 20, expiryDate: new Date('2027-09-01') },
  { name: 'Gatorade Zero Powder', sku: 'GAT-HY-002', category: 'Hydration & Electrolytes', brand: 'Gatorade', flavor: 'Lemon Lime', purchasePrice: 5.00, sellingPrice: 11.99, quantity: 60, minStock: 18, expiryDate: new Date('2027-09-01') },
  { name: 'Nuun Sport Electrolytes', sku: 'NU-HY-001', category: 'Hydration & Electrolytes', brand: 'Nuun', flavor: 'Lemon Lime', purchasePrice: 6.00, sellingPrice: 12.99, quantity: 45, minStock: 15, expiryDate: new Date('2027-11-01') },
  { name: 'Nuun Sport Electrolytes', sku: 'NU-HY-002', category: 'Hydration & Electrolytes', brand: 'Nuun', flavor: 'Fruit Punch', purchasePrice: 6.00, sellingPrice: 12.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-11-01') },
  { name: 'Electrolyte Stamina', sku: 'NOW-ES-001', category: 'Hydration & Electrolytes', brand: 'NOW Foods', flavor: null, purchasePrice: 5.00, sellingPrice: 11.99, quantity: 45, minStock: 15, expiryDate: new Date('2027-09-01') },
  { name: 'Endurox R4 Recovery', sku: 'EX-R4-001', category: 'Hydration & Electrolytes', brand: 'Endurox', flavor: 'Lemon Lime', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-05-01') },

  // ═══════════════════════════════════════════════════════════════
  // GREENS & SUPERFOODS (6 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Greens Blend', sku: 'AG-GS-001', category: 'Greens & Superfoods', brand: 'Amazing Grass', flavor: 'Berry', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-10-01') },
  { name: 'Greens Blend', sku: 'AG-GS-002', category: 'Greens & Superfoods', brand: 'Amazing Grass', flavor: 'Chocolate', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-10-01') },
  { name: 'Athletic Greens AG1', sku: 'AG1-GS-001', category: 'Greens & Superfoods', brand: 'Athletic Greens', flavor: null, purchasePrice: 25.00, sellingPrice: 49.99, quantity: 15, minStock: 5, expiryDate: new Date('2027-09-15') },
  { name: 'Green Superfood Powder', sku: 'GOL-GS-001', category: 'Greens & Superfoods', brand: 'Garden of Life', flavor: 'Chocolate Cacao', purchasePrice: 20.00, sellingPrice: 37.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-11-01') },
  { name: 'Greens & Superfoods', sku: 'TL-GS-001', category: 'Greens & Superfoods', brand: 'Transparent Labs', flavor: 'Tropical Fruit', purchasePrice: 22.00, sellingPrice: 44.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-12-01') },
  { name: 'Bloom Greens', sku: 'BL-GS-001', category: 'Greens & Superfoods', brand: 'Bloom Nutrition', flavor: 'Berry', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 28, minStock: 10, expiryDate: new Date('2027-11-15') },

  // ═══════════════════════════════════════════════════════════════
  // PUMP & NITRIC OXIDE (6 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'NO-XPLODE', sku: 'BSN-NO-001', category: 'Pump & Nitric Oxide', brand: 'BSN', flavor: 'Blue Razz', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 28, minStock: 10, expiryDate: new Date('2027-05-15') },
  { name: 'Nitric Oxide Surge', sku: 'TL-NO-001', category: 'Pump & Nitric Oxide', brand: 'Transparent Labs', flavor: 'Watermelon', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-09-15') },
  { name: 'Nitric Surge', sku: 'JF-NO-001', category: 'Pump & Nitric Oxide', brand: 'Jacked Factory', flavor: 'Blue Raspberry', purchasePrice: 14.00, sellingPrice: 28.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-10-01') },
  { name: 'Betaine Anhydrous', sku: 'NOW-BT-001', category: 'Pump & Nitric Oxide', brand: 'NOW Foods', flavor: 'Unflavored', purchasePrice: 10.00, sellingPrice: 21.99, quantity: 25, minStock: 8, expiryDate: new Date('2028-03-01') },
  { name: 'Vasomax Pump', sku: 'DM-PMP-001', category: 'Pump & Nitric Oxide', brand: 'Dymatize', flavor: 'Fruit Punch', purchasePrice: 20.00, sellingPrice: 37.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-08-15') },
  { name: 'Pump Fuel Insanity', sku: 'DF-PMP-001', category: 'Pump & Nitric Oxide', brand: 'Gaspari Nutrition', flavor: 'Grape', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 20, minStock: 8, expiryDate: new Date('2027-04-15') },

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE & ENDURANCE (6 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Beta-Alanine Powder', sku: 'ON-BA-001', category: 'Performance & Endurance', brand: 'Optimum Nutrition', flavor: 'Unflavored', purchasePrice: 10.00, sellingPrice: 21.99, quantity: 25, minStock: 8, expiryDate: new Date('2028-03-01') },
  { name: 'Citrulline Malate 2:1', sku: 'NOW-CM-001', category: 'Performance & Endurance', brand: 'NOW Sports', flavor: 'Unflavored', purchasePrice: 9.00, sellingPrice: 18.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-11-01') },
  { name: 'Beet Root Extract', sku: 'NOW-BR-001', category: 'Performance & Endurance', brand: 'NOW Foods', flavor: null, purchasePrice: 8.00, sellingPrice: 17.99, quantity: 30, minStock: 10, expiryDate: new Date('2028-01-15') },
  { name: 'Beta-Alanine 3.2g', sku: 'JF-BA-001', category: 'Performance & Endurance', brand: 'Jacked Factory', flavor: 'Unflavored', purchasePrice: 9.00, sellingPrice: 19.99, quantity: 28, minStock: 8, expiryDate: new Date('2028-02-01') },
  { name: 'L-Citrulline 6000mg', sku: 'NP-CI-001', category: 'Performance & Endurance', brand: 'Nutricost', flavor: 'Unflavored', purchasePrice: 10.00, sellingPrice: 21.99, quantity: 22, minStock: 6, expiryDate: new Date('2028-03-15') },
  { name: 'Endurance Fuel', sku: 'TL-EF-001', category: 'Performance & Endurance', brand: 'Transparent Labs', flavor: 'Lemon Lime', purchasePrice: 16.00, sellingPrice: 32.99, quantity: 18, minStock: 6, expiryDate: new Date('2027-12-01') },

  // ═══════════════════════════════════════════════════════════════
  // RECOVERY (4 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Glutamine Recovery', sku: 'DM-GL-001', category: 'Recovery', brand: 'Dymatize', flavor: 'Unflavored', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-07-01') },
  { name: 'Glutamine Powder', sku: 'ON-GL-001', category: 'Recovery', brand: 'Optimum Nutrition', flavor: 'Unflavored', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 45, minStock: 12, expiryDate: new Date('2027-09-01') },
  { name: 'HMB 1000mg', sku: 'ON-HMB-001', category: 'Recovery', brand: 'Optimum Nutrition', flavor: null, purchasePrice: 14.00, sellingPrice: 27.99, quantity: 20, minStock: 8, expiryDate: new Date('2027-08-15') },
  { name: 'Tart Cherry Extract 500mg', sku: 'NOW-RC-002', category: 'Recovery', brand: 'NOW Foods', flavor: null, purchasePrice: 8.00, sellingPrice: 17.99, quantity: 28, minStock: 8, expiryDate: new Date('2028-01-01') },

  // ═══════════════════════════════════════════════════════════════
  // HEALTH / OTHER (6 products)
  // ═══════════════════════════════════════════════════════════════
  { name: 'Vitamin D3 + K2 Drops', sku: 'NOW-DK-001', category: 'Health', brand: 'NOW Foods', flavor: null, purchasePrice: 8.00, sellingPrice: 16.99, quantity: 35, minStock: 10, expiryDate: new Date('2028-02-15') },
  { name: 'Curcumin 500mg', sku: 'NOW-CU-001', category: 'Health', brand: 'NOW Foods', flavor: null, purchasePrice: 10.00, sellingPrice: 21.99, quantity: 30, minStock: 8, expiryDate: new Date('2028-03-01') },
  { name: 'Elderberry Extract', sku: 'NM-EB-001', category: 'Health', brand: 'Nature Made', flavor: null, purchasePrice: 9.00, sellingPrice: 18.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-12-01') },
  { name: 'Omega-3 Fish Oil Gummies', sku: 'SR-FO-002', category: 'Health', brand: 'Sports Research', flavor: 'Lemon', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-11-01') },
  { name: 'Apple Cider Vinegar', sku: 'NOW-ACV-001', category: 'Health', brand: 'NOW Foods', flavor: null, purchasePrice: 5.00, sellingPrice: 11.99, quantity: 40, minStock: 12, expiryDate: new Date('2028-04-01') },
  { name: 'Protein Bar Variety', sku: 'ON-PB-001', category: 'Health', brand: 'Optimum Nutrition', flavor: 'Chocolate', purchasePrice: 18.00, sellingPrice: 32.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-06-01') },
]

const customers = [
  { name: 'John Smith', email: 'john@example.com', phone: '555-0101', address: '123 Main St, Apt 4B, New York, NY 10001' },
  { name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0102', address: '456 Oak Ave, Brooklyn, NY 11201' },
  { name: 'Mike Williams', email: 'mike@example.com', phone: '555-0103', address: '789 Pine Rd, Queens, NY 11375' },
  { name: 'Emily Brown', email: 'emily@example.com', phone: '555-0104', address: '321 Elm St, Manhattan, NY 10002' },
  { name: 'Chris Davis', phone: '555-0105', address: '654 Maple Dr, Bronx, NY 10451' },
  { name: 'Jessica Martinez', email: 'jessica@example.com', phone: '555-0106', address: '987 Cedar Ln, Staten Island, NY 10301' },
  { name: 'David Wilson', email: 'david@example.com', phone: '555-0107', address: '159 Birch Way, Hoboken, NJ 07030' },
  { name: 'Amanda Lee', email: 'amanda@example.com', phone: '555-0108', address: '753 Walnut St, Jersey City, NJ 07302' },
]

const suppliers = [
  { name: 'NutriCorp Wholesale', contactPerson: 'David Lee', email: 'david@nutricorp.com', phone: '555-1001', address: '123 Industrial Blvd, Los Angeles, CA 90001', notes: 'Primary supplier for ON, BSN, MuscleTech products. Net-30 terms.' },
  { name: 'FitSupply Co', contactPerson: 'Lisa Wang', email: 'lisa@fitsupply.com', phone: '555-1002', address: '456 Commerce St, New York, NY 10001', notes: 'Specializes in Ghost, Cellucor, Rule One. Minimum order $500.' },
  { name: 'Global Supplements Inc', contactPerson: 'James Miller', email: 'james@globalsupp.com', phone: '555-1003', address: '789 Trade Ave, Chicago, IL 60601', notes: 'Bulk pricing on creatine, vitamins, NOW Sports. Ships nationwide.' },
  { name: 'Direct Nutrition Depot', contactPerson: 'Maria Garcia', email: 'maria@directnutrition.com', phone: '555-1004', address: '321 Warehouse Way, Dallas, TX 75201', notes: 'Discount supplier. Best prices on mass gainers and casein.' },
]

async function main() {
  console.log('Seeding database with full supplement catalog...')

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

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || generatePassword()
  const staffPassword = process.env.SEED_STAFF_PASSWORD || generatePassword()
  const hashedAdmin = await bcrypt.hash(adminPassword, 14)
  const hashedStaff = await bcrypt.hash(staffPassword, 14)

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@supplementshop.com' } },
    update: { password: hashedAdmin, isActive: true, failedLoginAttempts: 0 },
    create: {
      email: 'admin@supplementshop.com',
      name: 'Admin User',
      password: hashedAdmin,
      role: Role.ADMIN,
      tenantId: tenant.id,
    },
  })

  const manager = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'manager@supplementshop.com' } },
    update: { password: hashedStaff, isActive: true, failedLoginAttempts: 0 },
    create: {
      email: 'manager@supplementshop.com',
      name: 'Manager User',
      password: hashedStaff,
      role: Role.MANAGER,
      tenantId: tenant.id,
    },
  })

  const staff = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'staff@supplementshop.com' } },
    update: { password: hashedStaff, isActive: true, failedLoginAttempts: 0 },
    create: {
      email: 'staff@supplementshop.com',
      name: 'Staff User',
      password: hashedStaff,
      role: Role.STAFF,
      tenantId: tenant.id,
    },
  })

  console.log('Created users:', admin.email, manager.email, staff.email)

  const createdProducts = []
  for (const product of products) {
    const p = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: product.sku } },
      update: { quantity: product.quantity },
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

  const createdCustomers = []
  const existingCustomerCount = await prisma.customer.count({ where: { tenantId: tenant.id } })
  if (existingCustomerCount < 8) {
    for (const customer of customers) {
      const c = await prisma.customer.create({
        data: { ...customer, tenantId: tenant.id },
      })
      createdCustomers.push(c)
    }
    console.log('Created', createdCustomers.length, 'customers')
  } else {
    console.log('Customers already exist, skipping')
  }

  const createdSuppliers = []
  const existingSupplierCount = await prisma.supplier.count({ where: { tenantId: tenant.id } })
  if (existingSupplierCount < 4) {
    for (const supplier of suppliers) {
      const s = await prisma.supplier.create({
        data: { ...supplier, tenantId: tenant.id },
      })
      createdSuppliers.push(s)
    }
    console.log('Created', createdSuppliers.length, 'suppliers')
  } else {
    console.log('Suppliers already exist, skipping')
  }

  const paymentMethods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.TRANSFER]
  const existingSales = await prisma.sale.count({ where: { tenantId: tenant.id } })
  if (existingSales < 10) {
    const sales = []
    for (let i = 0; i < 25; i++) {
      const product = createdProducts[i % createdProducts.length]
      const quantity = Math.floor(Math.random() * 3) + 1
      const unitPrice = Number(product.sellingPrice)
      const discount = i % 4 === 0 ? 5.00 : 0
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
  } else {
    console.log('Sales already exist, skipping')
  }

  console.log('Seed complete!')
  console.log('')
  console.log('Login credentials (use SEED_ADMIN_PASSWORD/SEED_STAFF_PASSWORD env vars):')
  console.log('  Admin:   admin@supplementshop.com / ' + (process.env.SEED_ADMIN_PASSWORD || '(auto-generated)'))
  console.log('  Manager: manager@supplementshop.com / ' + (process.env.SEED_STAFF_PASSWORD || '(auto-generated)'))
  console.log('  Staff:   staff@supplementshop.com / ' + (process.env.SEED_STAFF_PASSWORD || '(auto-generated)'))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
