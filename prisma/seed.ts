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
  // ===== PROTEIN - WHEY =====
  { name: 'Gold Standard 100% Whey', sku: 'ON-WP-001', category: 'Protein', brand: 'Optimum Nutrition', purchasePrice: 42.00, sellingPrice: 69.99, quantity: 60, minStock: 15, expiryDate: new Date('2027-06-01') },
  { name: 'Hydro whey Isolate', sku: 'ON-WP-002', category: 'Protein', brand: 'Optimum Nutrition', purchasePrice: 55.00, sellingPrice: 89.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-03-15') },
  { name: 'Protein Serious Mass', sku: 'ON-MG-001', category: 'Mass Gainer', brand: 'Optimum Nutrition', purchasePrice: 32.00, sellingPrice: 54.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-01-20') },
  { name: 'Gold Standard Casein', sku: 'ON-CS-001', category: 'Protein', brand: 'Optimum Nutrition', purchasePrice: 40.00, sellingPrice: 64.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-05-01') },
  { name: 'Plant Protein Organic', sku: 'ON-PP-001', category: 'Protein', brand: 'Optimum Nutrition', purchasePrice: 38.00, sellingPrice: 59.99, quantity: 20, minStock: 8, expiryDate: new Date('2027-04-10') },

  // ===== PROTEIN - MUSCLETECH =====
  { name: 'NitroTech Whey Gold', sku: 'MT-WP-001', category: 'Protein', brand: 'MuscleTech', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-02-28') },
  { name: 'NitroTech Mass', sku: 'MT-MG-001', category: 'Mass Gainer', brand: 'MuscleTech', purchasePrice: 30.00, sellingPrice: 49.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-01-15') },
  { name: 'Cell-Tech Performance', sku: 'MT-CT-001', category: 'Creatine', brand: 'MuscleTech', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-03-01') },
  { name: 'Platinum 100% Creatine', sku: 'MT-CR-001', category: 'Creatine', brand: 'MuscleTech', purchasePrice: 10.00, sellingPrice: 19.99, quantity: 70, minStock: 20, expiryDate: new Date('2028-01-01') },
  { name: 'Hydroxycut Hardcore Elite', sku: 'MT-FB-001', category: 'Fat Burner', brand: 'MuscleTech', purchasePrice: 15.00, sellingPrice: 29.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-06-15') },

  // ===== PRE-WORKOUT =====
  { name: 'C4 Original', sku: 'CEL-PW-001', category: 'Pre-Workout', brand: 'Cellucor', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-08-01') },
  { name: 'C4 Ultimate', sku: 'CEL-PW-002', category: 'Pre-Workout', brand: 'Cellucor', purchasePrice: 28.00, sellingPrice: 49.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-07-15') },
  { name: 'C4 Sport', sku: 'CEL-PW-003', category: 'Pre-Workout', brand: 'Cellucor', purchasePrice: 14.00, sellingPrice: 26.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-09-01') },
  { name: 'Ghost Legend V4', sku: 'GHO-PW-001', category: 'Pre-Workout', brand: 'Ghost', purchasePrice: 26.00, sellingPrice: 44.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-05-01') },
  { name: 'Ghost泵 Nitric Oxide', sku: 'GHO-PW-002', category: 'Pre-Workout', brand: 'Ghost', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-06-01') },
  { name: 'Mr. Hyde Intense', sku: 'NF-PW-001', category: 'Pre-Workout', brand: 'NitroFuse', purchasePrice: 20.00, sellingPrice: 36.99, quantity: 32, minStock: 10, expiryDate: new Date('2027-04-15') },
  { name: 'Pre JYM', sku: 'JYM-PW-001', category: 'Pre-Workout', brand: 'JYM Supplement Science', purchasePrice: 24.00, sellingPrice: 42.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-03-20') },

  // ===== BCAA / AMINO ACIDS =====
  { name: 'BCAA Powder', sku: 'GHO-AA-001', category: 'Amino Acids', brand: 'Ghost', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-05-15') },
  { name: 'Amino X', sku: 'BSN-AA-001', category: 'Amino Acids', brand: 'BSN', purchasePrice: 16.00, sellingPrice: 29.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-04-01') },
  { name: 'EAA Complex', sku: 'ON-AA-001', category: 'Amino Acids', brand: 'Optimum Nutrition', purchasePrice: 17.00, sellingPrice: 32.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-06-20') },
  { name: 'Glutamine Powder', sku: 'ON-GL-001', category: 'Recovery', brand: 'Optimum Nutrition', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 45, minStock: 12, expiryDate: new Date('2027-09-01') },
  { name: 'BCAA 1000 caps', sku: 'ON-AA-002', category: 'Amino Acids', brand: 'Optimum Nutrition', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 40, minStock: 10, expiryDate: new Date('2027-07-01') },

  // ===== CREATINE =====
  { name: 'Creatine Monohydrate', sku: 'ON-CR-001', category: 'Creatine', brand: 'Optimum Nutrition', purchasePrice: 11.00, sellingPrice: 21.99, quantity: 80, minStock: 25, expiryDate: new Date('2028-06-01') },
  { name: 'Creatine HCL', sku: 'CEL-CR-001', category: 'Creatine', brand: 'Cellucor', purchasePrice: 16.00, sellingPrice: 29.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-12-01') },
  { name: 'Creatine Mono', sku: 'BSN-CR-001', category: 'Creatine', brand: 'BSN', purchasePrice: 10.00, sellingPrice: 19.99, quantity: 55, minStock: 15, expiryDate: new Date('2028-03-01') },
  { name: 'Creatine 500g', sku: 'NOW-CR-001', category: 'Creatine', brand: 'NOW Sports', purchasePrice: 9.00, sellingPrice: 17.99, quantity: 60, minStock: 15, expiryDate: new Date('2028-01-15') },
  { name: 'HCL Creatine Capsules', sku: 'MT-CR-002', category: 'Creatine', brand: 'MuscleTech', purchasePrice: 13.00, sellingPrice: 24.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-11-01') },

  // ===== FISH OIL / OMEGA / HEALTH =====
  { name: 'Fish Oil Omega-3', sku: 'ON-FO-001', category: 'Health', brand: 'Optimum Nutrition', purchasePrice: 13.00, sellingPrice: 24.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-08-01') },
  { name: 'Ultimate Omega', sku: 'NN-FO-001', category: 'Health', brand: 'Nordic Naturals', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-06-15') },
  { name: 'CoQ10 100mg', sku: 'NOW-CQ-001', category: 'Health', brand: 'NOW Foods', purchasePrice: 12.00, sellingPrice: 22.99, quantity: 40, minStock: 10, expiryDate: new Date('2027-12-01') },
  { name: 'Joint Support Plus', sku: 'NOW-JS-001', category: 'Joint Support', brand: 'NOW Foods', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 30, minStock: 8, expiryDate: new Date('2027-09-15') },
  { name: 'Glucosamine Chondroitin', sku: 'NM-JS-001', category: 'Joint Support', brand: 'Nature Made', purchasePrice: 11.00, sellingPrice: 22.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-10-01') },
  { name: 'Probiotics 50 Billion', sku: 'NOW-PB-001', category: 'Health', brand: 'NOW Foods', purchasePrice: 15.00, sellingPrice: 29.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-07-01') },
  { name: 'Vitamin D3 5000 IU', sku: 'NOW-VD-001', category: 'Vitamins', brand: 'NOW Foods', purchasePrice: 6.00, sellingPrice: 12.99, quantity: 70, minStock: 20, expiryDate: new Date('2028-03-01') },
  { name: 'Vitamin C 1000mg', sku: 'NM-VC-001', category: 'Vitamins', brand: 'Nature Made', purchasePrice: 5.00, sellingPrice: 11.99, quantity: 80, minStock: 25, expiryDate: new Date('2028-06-01') },
  { name: 'Zinc 50mg', sku: 'NOW-ZN-001', category: 'Vitamins', brand: 'NOW Foods', purchasePrice: 4.00, sellingPrice: 8.99, quantity: 65, minStock: 20, expiryDate: new Date('2028-04-01') },

  // ===== MULTIVITAMINS =====
  { name: 'Opti-Men Daily Formula', sku: 'ON-MV-001', category: 'Vitamins', brand: 'Optimum Nutrition', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 45, minStock: 15, expiryDate: new Date('2027-09-01') },
  { name: 'Opti-Women Daily Formula', sku: 'ON-MV-002', category: 'Vitamins', brand: 'Optimum Nutrition', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-08-15') },
  { name: 'Animal Pak Multi', sku: 'UN-MV-001', category: 'Vitamins', brand: 'Universal Nutrition', purchasePrice: 16.00, sellingPrice: 32.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-11-01') },
  { name: 'Daily One Multivitamin', sku: 'NOW-MV-001', category: 'Vitamins', brand: 'NOW Foods', purchasePrice: 8.00, sellingPrice: 16.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-10-01') },
  { name: 'Mega Men Sport Multi', sku: 'GNC-MV-001', category: 'Vitamins', brand: 'GNC', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-12-15') },

  // ===== FAT BURNER / WEIGHT LOSS =====
  { name: 'Hydroxycut Hardcore', sku: 'MT-FB-002', category: 'Fat Burner', brand: 'MuscleTech', purchasePrice: 15.00, sellingPrice: 29.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-06-01') },
  { name: 'LeanMode Stim-Free', sku: 'EV-FB-001', category: 'Fat Burner', brand: 'Evlution Nutrition', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-05-01') },
  { name: 'L-Carnitine 1000mg', sku: 'NOW-FB-001', category: 'Fat Burner', brand: 'NOW Sports', purchasePrice: 8.00, sellingPrice: 16.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-08-01') },
  { name: 'Shred Matrix', sku: 'BSN-FB-001', category: 'Fat Burner', brand: 'BSN', purchasePrice: 16.00, sellingPrice: 31.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-04-15') },
  { name: 'CLA 1000mg Softgels', sku: 'ON-FB-001', category: 'Fat Burner', brand: 'Optimum Nutrition', purchasePrice: 10.00, sellingPrice: 21.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-09-01') },

  // ===== MASS GAINERS =====
  { name: 'True-Mass 1200', sku: 'BSN-MG-001', category: 'Mass Gainer', brand: 'BSN', purchasePrice: 30.00, sellingPrice: 52.99, quantity: 20, minStock: 8, expiryDate: new Date('2027-03-01') },
  { name: 'Super Mass Gainer', sku: 'DM-MG-001', category: 'Mass Gainer', brand: 'Dymatize', purchasePrice: 28.00, sellingPrice: 49.99, quantity: 18, minStock: 8, expiryDate: new Date('2027-02-15') },
  { name: 'Mega Gainer Pro', sku: 'UN-MG-001', category: 'Mass Gainer', brand: 'Universal Nutrition', purchasePrice: 26.00, sellingPrice: 46.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-04-01') },

  // ===== RECOVERY =====
  { name: 'ZMA Recovery', sku: 'NOW-ZM-001', category: 'Recovery', brand: 'NOW Sports', purchasePrice: 7.00, sellingPrice: 15.99, quantity: 55, minStock: 15, expiryDate: new Date('2028-01-01') },
  { name: 'Glutamine Recovery', sku: 'DM-GL-001', category: 'Recovery', brand: 'Dymatize', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-07-01') },
  { name: 'Tart Cherry Extract', sku: 'NOW-RC-001', category: 'Recovery', brand: 'NOW Foods', purchasePrice: 9.00, sellingPrice: 18.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-10-01') },
  { name: 'HMB 1000mg', sku: 'ON-HMB-001', category: 'Recovery', brand: 'Optimum Nutrition', purchasePrice: 14.00, sellingPrice: 27.99, quantity: 20, minStock: 8, expiryDate: new Date('2027-08-15') },

  // ===== PUMP / VOLUMIZER =====
  { name: 'NO-XPLODE Pre-Workout', sku: 'BSN-PW-002', category: 'Pre-Workout', brand: 'BSN', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 28, minStock: 10, expiryDate: new Date('2027-05-15') },
  { name: 'N.O.-XPLODE 2.0', sku: 'BSN-PW-003', category: 'Pre-Workout', brand: 'BSN', purchasePrice: 19.00, sellingPrice: 34.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-06-01') },
  { name: 'Pump Fuel Insanity', sku: 'DF-PW-001', category: 'Pre-Workout', brand: 'Gaspari Nutrition', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 20, minStock: 8, expiryDate: new Date('2027-04-15') },

  // ===== TESTOSTERONE / HORMONE =====
  { name: 'Animal Pak Test', sku: 'UN-TB-001', category: 'Testosterone', brand: 'Universal Nutrition', purchasePrice: 18.00, sellingPrice: 34.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-07-01') },
  { name: 'Tribulus 1000mg', sku: 'NOW-TB-001', category: 'Testosterone', brand: 'NOW Foods', purchasePrice: 7.00, sellingPrice: 14.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-09-01') },
  { name: 'ZMA Pro', sku: 'ON-TB-001', category: 'Testosterone', brand: 'Optimum Nutrition', purchasePrice: 9.00, sellingPrice: 18.99, quantity: 40, minStock: 12, expiryDate: new Date('2028-02-01') },

  // ===== HYDRATION =====
  { name: 'Hydrowhey Protein', sku: 'ON-HY-001', category: 'Hydration', brand: 'Optimum Nutrition', purchasePrice: 10.00, sellingPrice: 19.99, quantity: 45, minStock: 12, expiryDate: new Date('2027-12-01') },
  { name: 'Electrolyte Mix', sku: 'LM-ELEC-001', category: 'Hydration', brand: 'Liquid IV', purchasePrice: 8.00, sellingPrice: 16.99, quantity: 50, minStock: 15, expiryDate: new Date('2027-10-15') },
  { name: 'Prime Hydration', sku: 'PR-HY-001', category: 'Hydration', brand: 'Prime', purchasePrice: 6.00, sellingPrice: 12.99, quantity: 60, minStock: 20, expiryDate: new Date('2027-06-01') },
  { name: 'Endurox R4 Recovery', sku: 'EX-R4-001', category: 'Hydration', brand: 'Endurox', purchasePrice: 12.00, sellingPrice: 24.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-05-01') },

  // ===== SLEEP / RELAXATION =====
  { name: 'Melatonin 5mg', sku: 'NOW-ML-001', category: 'Sleep', brand: 'NOW Foods', purchasePrice: 4.00, sellingPrice: 9.99, quantity: 60, minStock: 20, expiryDate: new Date('2028-06-01') },
  { name: 'ZMA Night Recovery', sku: 'BSN-ZM-001', category: 'Sleep', brand: 'BSN', purchasePrice: 8.00, sellingPrice: 17.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-11-01') },
  { name: 'GABA 750mg', sku: 'NOW-GA-001', category: 'Sleep', brand: 'NOW Foods', purchasePrice: 6.00, sellingPrice: 12.99, quantity: 30, minStock: 8, expiryDate: new Date('2027-09-15') },

  // ===== ADDITIONAL POPULAR PRODUCTS =====
  { name: 'Collagen Peptides', sku: 'VL-CP-001', category: 'Health', brand: 'Vital Proteins', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-08-01') },
  { name: 'Whey Protein Concentrate', sku: 'DM-WP-001', category: 'Protein', brand: 'Dymatize', purchasePrice: 35.00, sellingPrice: 57.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-06-01') },
  { name: 'ISO100 Hydrolyzed', sku: 'DM-WP-002', category: 'Protein', brand: 'Dymatize', purchasePrice: 48.00, sellingPrice: 79.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-04-15') },
  { name: 'R1 Whey Protein', sku: 'R1-WP-001', category: 'Protein', brand: 'Rule One Proteins', purchasePrice: 38.00, sellingPrice: 62.99, quantity: 35, minStock: 10, expiryDate: new Date('2027-07-01') },
  { name: 'R1 Pre-Workout', sku: 'R1-PW-001', category: 'Pre-Workout', brand: 'Rule One Proteins', purchasePrice: 22.00, sellingPrice: 39.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-05-15') },
  { name: 'Whey Strong Protein', sku: 'GNC-WP-001', category: 'Protein', brand: 'GNC', purchasePrice: 32.00, sellingPrice: 54.99, quantity: 25, minStock: 8, expiryDate: new Date('2027-03-01') },
  { name: 'Nitro-Tech 100% Whey', sku: 'MT-WP-002', category: 'Protein', brand: 'MuscleTech', purchasePrice: 36.00, sellingPrice: 59.99, quantity: 38, minStock: 10, expiryDate: new Date('2027-05-01') },
  { name: 'Pre-Workout Igniter', sku: 'UN-PW-001', category: 'Pre-Workout', brand: 'Universal Nutrition', purchasePrice: 16.00, sellingPrice: 29.99, quantity: 28, minStock: 8, expiryDate: new Date('2027-06-15') },
  { name: 'BCAA Powder 2:1:1', sku: 'DM-AA-001', category: 'Amino Acids', brand: 'Dymatize', purchasePrice: 15.00, sellingPrice: 29.99, quantity: 30, minStock: 10, expiryDate: new Date('2027-04-01') },
  { name: 'Complete Amino Energy', sku: 'ON-AA-003', category: 'Amino Acids', brand: 'Optimum Nutrition', purchasePrice: 13.00, sellingPrice: 25.99, quantity: 40, minStock: 12, expiryDate: new Date('2027-08-15') },
  { name: 'Prebiotic Fiber', sku: 'NOW-PF-001', category: 'Health', brand: 'NOW Foods', purchasePrice: 7.00, sellingPrice: 14.99, quantity: 30, minStock: 8, expiryDate: new Date('2027-10-15') },
  { name: 'Ashwagandha KSM-66', sku: 'NOW-AW-001', category: 'Health', brand: 'NOW Foods', purchasePrice: 8.00, sellingPrice: 17.99, quantity: 35, minStock: 10, expiryDate: new Date('2028-01-01') },
  { name: 'Beta-Alanine Powder', sku: 'ON-BA-001', category: 'Performance', brand: 'Optimum Nutrition', purchasePrice: 10.00, sellingPrice: 21.99, quantity: 25, minStock: 8, expiryDate: new Date('2028-03-01') },
  { name: 'Citrulline Malate', sku: 'NOW-CM-001', category: 'Performance', brand: 'NOW Sports', purchasePrice: 9.00, sellingPrice: 18.99, quantity: 20, minStock: 6, expiryDate: new Date('2027-11-01') },
  { name: 'Electrolyte Stamina', sku: 'NOW-ES-001', category: 'Hydration', brand: 'NOW Foods', purchasePrice: 5.00, sellingPrice: 11.99, quantity: 45, minStock: 15, expiryDate: new Date('2027-09-01') },
  { name: 'Whey Protein Isolate Clear', sku: 'ON-WI-001', category: 'Protein', brand: 'Optimum Nutrition', purchasePrice: 40.00, sellingPrice: 64.99, quantity: 22, minStock: 8, expiryDate: new Date('2027-05-01') },
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
  for (const customer of customers) {
    const c = await prisma.customer.create({
      data: { ...customer, tenantId: tenant.id },
    })
    createdCustomers.push(c)
  }

  console.log('Created', createdCustomers.length, 'customers')

  const createdSuppliers = []
  for (const supplier of suppliers) {
    const s = await prisma.supplier.create({
      data: { ...supplier, tenantId: tenant.id },
    })
    createdSuppliers.push(s)
  }

  console.log('Created', createdSuppliers.length, 'suppliers')

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
