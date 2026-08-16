import { PrismaNeonHttp } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const url = process.env.DATABASE_URL!
const adapter = new PrismaNeonHttp(url, {})
const prisma = new PrismaClient({ adapter })

const TENANT_ID = '51cb691a-f657-46bb-94c5-717d75348cf7' // Supplement Shop

interface SeedProduct {
  name: string
  sku: string
  category: string
  brand: string
  flavor?: string
  size: string
  purchasePrice: number
  sellingPrice: number
  gstRate: number
  quantity: number
  minStock: number
}

const products: SeedProduct[] = [
  // ========== WHEY PROTEIN ==========
  { name: 'Gold Standard Whey Protein', sku: 'ON-WP-001', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Double Rich Chocolate', size: '2 lbs', purchasePrice: 3200, sellingPrice: 4499, gstRate: 18, quantity: 45, minStock: 10 },
  { name: 'Gold Standard Whey Protein', sku: 'ON-WP-002', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Vanilla Ice Cream', size: '2 lbs', purchasePrice: 3200, sellingPrice: 4499, gstRate: 18, quantity: 30, minStock: 10 },
  { name: 'Gold Standard Whey Isolate', sku: 'ON-WPI-001', category: 'Whey Protein', brand: 'Optimum Nutrition', flavor: 'Double Rich Chocolate', size: '2 lbs', purchasePrice: 4500, sellingPrice: 5999, gstRate: 18, quantity: 25, minStock: 10 },
  { name: 'Biozyme Performance Whey', sku: 'MB-BPW-001', category: 'Whey Protein', brand: 'MuscleBlaze', flavor: 'Chocolate', size: '1 kg', purchasePrice: 1600, sellingPrice: 2199, gstRate: 18, quantity: 60, minStock: 15 },
  { name: 'Biozyme Performance Whey', sku: 'MB-BPW-002', category: 'Whey Protein', brand: 'MuscleBlaze', flavor: 'Kesar Thandai', size: '1 kg', purchasePrice: 1600, sellingPrice: 2199, gstRate: 18, quantity: 40, minStock: 15 },
  { name: 'ATOM Whey Protein', sku: 'ASIT-WP-001', category: 'Whey Protein', brand: 'AS-IT-IS', flavor: 'Chocolate', size: '1 kg', purchasePrice: 1350, sellingPrice: 1899, gstRate: 18, quantity: 55, minStock: 15 },
  { name: 'ATOM Whey Protein', sku: 'ASIT-WP-002', category: 'Whey Protein', brand: 'AS-IT-IS', flavor: 'Unflavored', size: '1 kg', purchasePrice: 1250, sellingPrice: 1799, gstRate: 18, quantity: 50, minStock: 15 },
  { name: 'Perform Whey Concentrate', sku: 'NK-WPC-001', category: 'Whey Protein', brand: 'NAKPRO', flavor: 'Chocolate', size: '1 kg', purchasePrice: 1100, sellingPrice: 1599, gstRate: 18, quantity: 70, minStock: 20 },
  { name: 'Perform Whey Concentrate', sku: 'NK-WPC-002', category: 'Whey Protein', brand: 'NAKPRO', flavor: 'Unflavored', size: '1 kg', purchasePrice: 1000, sellingPrice: 1499, gstRate: 18, quantity: 65, minStock: 20 },
  { name: 'Absolute Whey Protein', sku: 'AV-WP-001', category: 'Whey Protein', brand: 'Avvatar', flavor: 'Malai Kulfi', size: '1 kg', purchasePrice: 1800, sellingPrice: 2499, gstRate: 18, quantity: 35, minStock: 10 },
  { name: 'Nitro Tech Whey Gold', sku: 'MT-NWG-001', category: 'Whey Protein', brand: 'MuscleTech', flavor: 'Double Chocolate', size: '2.5 lbs', purchasePrice: 3800, sellingPrice: 5299, gstRate: 18, quantity: 20, minStock: 5 },
  { name: 'Clear Whey Isolate', sku: 'MB-CWI-001', category: 'Whey Protein', brand: 'MuscleBlaze', flavor: 'Fruit Blast', size: '1 kg', purchasePrice: 1900, sellingPrice: 2599, gstRate: 18, quantity: 30, minStock: 10 },
  { name: 'Biozyme Whey Protein', sku: 'MB-BWP-001', category: 'Whey Protein', brand: 'MuscleBlaze', flavor: 'Rich Chocolate', size: '2 kg', purchasePrice: 2800, sellingPrice: 3799, gstRate: 18, quantity: 25, minStock: 10 },

  // ========== PLANT PROTEIN ==========
  { name: 'Plant Protein Isolate', sku: 'MB-PP-001', category: 'Plant Protein', brand: 'MuscleBlaze', flavor: 'Chocolate', size: '1 kg', purchasePrice: 1700, sellingPrice: 2299, gstRate: 18, quantity: 30, minStock: 10 },
  { name: ' pea Protein Isolate', sku: 'NK-PP-001', category: 'Plant Protein', brand: 'NAKPRO', flavor: 'Unflavored', size: '1 kg', purchasePrice: 1200, sellingPrice: 1699, gstRate: 18, quantity: 40, minStock: 10 },
  { name: ' plant Protein Blend', sku: 'HP-PP-001', category: 'Plant Protein', brand: 'HealthKart', flavor: 'Chocolate', size: '1 kg', purchasePrice: 1400, sellingPrice: 1999, gstRate: 18, quantity: 25, minStock: 10 },
  { name: ' plant Protein Isolate', sku: 'BF-PP-001', category: 'Plant Protein', brand: 'BigMuscles', flavor: 'Chocolate', size: '1 kg', purchasePrice: 1100, sellingPrice: 1599, gstRate: 18, quantity: 35, minStock: 10 },

  // ========== PRE-WORKOUT ==========
  { name: 'Pre-Workout Explosion', sku: 'MB-PWE-001', category: 'Pre-Workout', brand: 'MuscleBlaze', flavor: 'Fruit Punch', size: '300g', purchasePrice: 600, sellingPrice: 899, gstRate: 18, quantity: 50, minStock: 15 },
  { name: 'Pre-Workout 200 Xtreme', sku: 'MB-PWX-001', category: 'Pre-Workout', brand: 'MuscleBlaze', flavor: 'Blue Berry', size: '510g', purchasePrice: 1100, sellingPrice: 1599, gstRate: 18, quantity: 35, minStock: 10 },
  { name: 'WrathX Pre-Workout', sku: 'MB-WRX-001', category: 'Pre-Workout', brand: 'MuscleBlaze', flavor: 'Tropical Punch', size: '510g', purchasePrice: 1300, sellingPrice: 1899, gstRate: 18, quantity: 25, minStock: 10 },
  { name: 'Gold Standard Pre-Workout', sku: 'ON-GSPW-001', category: 'Pre-Workout', brand: 'Optimum Nutrition', flavor: 'Blue Raspberries', size: '300g', purchasePrice: 2000, sellingPrice: 2799, gstRate: 18, quantity: 20, minStock: 5 },
  { name: 'C4 Original Pre-Workout', sku: 'SP-C4-001', category: 'Pre-Workout', brand: 'Cellucor', flavor: 'Fruit Punch', size: '195g', purchasePrice: 1800, sellingPrice: 2499, gstRate: 18, quantity: 15, minStock: 5 },
  { name: 'NxtShift Pre-Workout', sku: 'PN-NXS-001', category: 'Pre-Workout', brand: 'Pure Nutrition', flavor: 'Orange', size: '250g', purchasePrice: 900, sellingPrice: 1399, gstRate: 18, quantity: 40, minStock: 10 },
  { name: 'Karnage Pre-Workout', sku: 'BM-KPW-001', category: 'Pre-Workout', brand: 'BigMuscles', flavor: 'Blue Razz', size: '300g', purchasePrice: 700, sellingPrice: 1199, gstRate: 18, quantity: 45, minStock: 10 },
  { name: 'Nakpro Pre-Workout', sku: 'NK-PW-001', category: 'Pre-Workout', brand: 'NAKPRO', flavor: 'Blueberry', size: '100g', purchasePrice: 250, sellingPrice: 449, gstRate: 18, quantity: 60, minStock: 20 },
  { name: 'Bolt Pre-Workout', sku: 'BLT-PW-001', category: 'Pre-Workout', brand: 'Bolt', flavor: 'Orange Tangy', size: '300g', purchasePrice: 350, sellingPrice: 599, gstRate: 18, quantity: 50, minStock: 15 },

  // ========== CREATINE ==========
  { name: 'Creatine Monohydrate', sku: 'NK-CM-001', category: 'Creatine', brand: 'NAKPRO', flavor: 'Unflavored', size: '250g', purchasePrice: 350, sellingPrice: 549, gstRate: 18, quantity: 80, minStock: 25 },
  { name: 'Creatine Monohydrate', sku: 'MB-CM-001', category: 'Creatine', brand: 'MuscleBlaze', flavor: 'Unflavored', size: '250g', purchasePrice: 450, sellingPrice: 699, gstRate: 18, quantity: 60, minStock: 20 },
  { name: 'Creatine Monohydrate', sku: 'ASIT-CM-001', category: 'Creatine', brand: 'AS-IT-IS', flavor: 'Unflavored', size: '250g', purchasePrice: 400, sellingPrice: 599, gstRate: 18, quantity: 55, minStock: 20 },
  { name: 'Micronised Creatine', sku: 'WC-CM-001', category: 'Creatine', brand: 'Wellcore', flavor: 'Unflavored', size: '250g', purchasePrice: 500, sellingPrice: 749, gstRate: 18, quantity: 40, minStock: 15 },
  { name: 'Creatine Monohydrate', sku: 'ON-CM-001', category: 'Creatine', brand: 'Optimum Nutrition', flavor: 'Unflavored', size: '300g', purchasePrice: 800, sellingPrice: 1199, gstRate: 18, quantity: 30, minStock: 10 },
  { name: 'Creatine HCL', sku: 'LC-CM-001', category: 'Creatine', brand: 'Lord\'s Choice', flavor: 'Unflavored', size: '90g', purchasePrice: 350, sellingPrice: 599, gstRate: 18, quantity: 45, minStock: 15 },
  { name: 'CreaPure Creatine', sku: 'MB-CP-001', category: 'Creatine', brand: 'MuscleBlaze', flavor: 'Unflavored', size: '300g', purchasePrice: 650, sellingPrice: 949, gstRate: 18, quantity: 35, minStock: 10 },

  // ========== BCAA & AMINO ACIDS ==========
  { name: 'BCAA Pro', sku: 'MB-BCAA-001', category: 'BCAA & Amino Acids', brand: 'MuscleBlaze', flavor: 'Tropical Fest', size: '250g', purchasePrice: 800, sellingPrice: 1199, gstRate: 18, quantity: 40, minStock: 10 },
  { name: 'BCAA 2:1:1', sku: 'ON-BCAA-001', category: 'BCAA & Amino Acids', brand: 'Optimum Nutrition', flavor: 'Fruit Punch', size: '285g', purchasePrice: 1000, sellingPrice: 1499, gstRate: 18, quantity: 25, minStock: 10 },
  { name: 'ATOM BCAA', sku: 'ASIT-BCAA-001', category: 'BCAA & Amino Acids', brand: 'AS-IT-IS', flavor: 'Watermelon', size: '250g', purchasePrice: 700, sellingPrice: 1049, gstRate: 18, quantity: 35, minStock: 10 },
  { name: 'Real BCAA with Electrolytes', sku: 'BM-BCAA-001', category: 'BCAA & Amino Acids', brand: 'BigMuscles', flavor: 'Green Apple', size: '300g', purchasePrice: 600, sellingPrice: 899, gstRate: 18, quantity: 45, minStock: 15 },
  { name: 'Glutamine', sku: 'ON-GLU-001', category: 'BCAA & Amino Acids', brand: 'Optimum Nutrition', flavor: 'Unflavored', size: '600g', purchasePrice: 1500, sellingPrice: 2199, gstRate: 18, quantity: 20, minStock: 5 },
  { name: 'XTEND BCAA', sku: 'SC-XTEND-001', category: 'BCAA & Amino Acids', brand: 'Scivation', flavor: 'Blue Raspberry', size: '420g', purchasePrice: 1400, sellingPrice: 1999, gstRate: 18, quantity: 20, minStock: 5 },

  // ========== MASS GAINER ==========
  { name: 'Mass Gainer XXL', sku: 'MB-MGXXL-001', category: 'Mass Gainer', brand: 'MuscleBlaze', flavor: 'Chocolate', size: '3 kg', purchasePrice: 2200, sellingPrice: 2999, gstRate: 18, quantity: 30, minStock: 10 },
  { name: 'Mass Gainer XXL', sku: 'MB-MGXXL-002', category: 'Mass Gainer', brand: 'MuscleBlaze', flavor: 'Kesar Pista', size: '3 kg', purchasePrice: 2200, sellingPrice: 2999, gstRate: 18, quantity: 25, minStock: 10 },
  { name: 'Super Mass Gainer', sku: 'ON-SMG-001', category: 'Mass Gainer', brand: 'Optimum Nutrition', flavor: 'Double Rich Chocolate', size: '5.45 lbs', purchasePrice: 4500, sellingPrice: 6299, gstRate: 18, quantity: 15, minStock: 5 },
  { name: 'Nitro-Tech Mass', sku: 'MT-NM-001', category: 'Mass Gainer', brand: 'MuscleTech', flavor: 'Chocolate', size: '4 kg', purchasePrice: 3500, sellingPrice: 4999, gstRate: 18, quantity: 15, minStock: 5 },
  { name: 'Mass Gainer', sku: 'BM-MG-001', category: 'Mass Gainer', brand: 'BigMuscles', flavor: 'Chocolate', size: '1 kg', purchasePrice: 500, sellingPrice: 799, gstRate: 18, quantity: 40, minStock: 15 },
  { name: 'Mass Gainer', sku: 'BM-MG-002', category: 'Mass Gainer', brand: 'BigMuscles', flavor: 'Vanilla', size: '1 kg', purchasePrice: 500, sellingPrice: 799, gstRate: 18, quantity: 35, minStock: 15 },
  { name: 'AMP Mass XXX', sku: 'GNC-AMP-001', category: 'Mass Gainer', brand: 'GNC', flavor: 'Chocolate', size: '2 kg', purchasePrice: 2000, sellingPrice: 2999, gstRate: 18, quantity: 20, minStock: 5 },
  { name: 'Endura Mass', sku: 'EM-001', category: 'Mass Gainer', brand: 'Endura Mass', flavor: 'Chocolate', size: '500g', purchasePrice: 300, sellingPrice: 499, gstRate: 18, quantity: 50, minStock: 15 },

  // ========== FAT BURNER ==========
  { name: 'L-Carnitine Liquid', sku: 'MB-LC-001', category: 'Fat Burner', brand: 'MuscleBlaze', flavor: 'Green Apple', size: '480ml', purchasePrice: 600, sellingPrice: 899, gstRate: 18, quantity: 30, minStock: 10 },
  { name: 'Shred X Fat Burner', sku: 'BM-SX-001', category: 'Fat Burner', brand: 'BigMuscles', flavor: 'Fruit Punch', size: '90 caps', purchasePrice: 500, sellingPrice: 799, gstRate: 18, quantity: 35, minStock: 10 },
  { name: 'Hydroxycut Hardcore', sku: 'MH-HC-001', category: 'Fat Burner', brand: 'MuscleTech', flavor: 'Capsules', size: '100 caps', purchasePrice: 1200, sellingPrice: 1799, gstRate: 18, quantity: 20, minStock: 5 },
  { name: 'Fat Burner', sku: 'NK-FB-001', category: 'Fat Burner', brand: 'NAKPRO', flavor: 'Capsules', size: '60 caps', purchasePrice: 350, sellingPrice: 599, gstRate: 18, quantity: 40, minStock: 10 },

  // ========== VITAMINS & MINERALS ==========
  { name: 'Daily Multivitamin', sku: 'MB-DMV-001', category: 'Vitamins & Minerals', brand: 'MuscleBlaze', flavor: 'Tablets', size: '60 tabs', purchasePrice: 400, sellingPrice: 599, gstRate: 12, quantity: 60, minStock: 20 },
  { name: 'Active Multivitamin', sku: 'ON-AMV-001', category: 'Vitamins & Minerals', brand: 'Optimum Nutrition', flavor: 'Tablets', size: '90 tabs', purchasePrice: 800, sellingPrice: 1199, gstRate: 12, quantity: 30, minStock: 10 },
  { name: 'Vitamin D3 60K', sku: 'HK-VD3-001', category: 'Vitamins & Minerals', brand: 'HK Vitals', flavor: 'Capsules', size: '60 caps', purchasePrice: 200, sellingPrice: 349, gstRate: 12, quantity: 80, minStock: 25 },
  { name: 'Vitamin C 1000mg', sku: 'HK-VC-001', category: 'Vitamins & Minerals', brand: 'HK Vitals', flavor: 'Tablets', size: '60 tabs', purchasePrice: 250, sellingPrice: 399, gstRate: 12, quantity: 70, minStock: 20 },
  { name: 'Zinc & Magnesium', sku: 'ON-ZMA-001', category: 'Vitamins & Minerals', brand: 'Optimum Nutrition', flavor: 'Capsules', size: '90 caps', purchasePrice: 600, sellingPrice: 899, gstRate: 12, quantity: 35, minStock: 10 },
  { name: 'Multivitamin for Men', sku: 'HM-MM-001', category: 'Vitamins & Minerals', brand: 'HealthKart', flavor: 'Tablets', size: '60 tabs', purchasePrice: 300, sellingPrice: 499, gstRate: 12, quantity: 50, minStock: 15 },
  { name: 'Vitamin D3 1000 IU', sku: 'CT-VD3-001', category: 'Vitamins & Minerals', brand: 'Centrum', flavor: 'Capsules', size: '30 caps', purchasePrice: 150, sellingPrice: 249, gstRate: 12, quantity: 60, minStock: 20 },
  { name: 'Zinc Supplements', sku: 'MB-ZN-001', category: 'Vitamins & Minerals', brand: 'MuscleBlaze', flavor: 'Tablets', size: '60 tabs', purchasePrice: 200, sellingPrice: 349, gstRate: 12, quantity: 45, minStock: 15 },

  // ========== FISH OIL & OMEGA ==========
  { name: 'Omega 3 Fish Oil 1000mg', sku: 'MB-FO-001', category: 'Fish Oil & Omega', brand: 'MuscleBlaze', flavor: 'Capsules', size: '90 caps', purchasePrice: 500, sellingPrice: 799, gstRate: 18, quantity: 50, minStock: 15 },
  { name: 'Fish Oil 1000mg', sku: 'HK-FO-001', category: 'Fish Oil & Omega', brand: 'HK Vitals', flavor: 'Capsules', size: '60 caps', purchasePrice: 250, sellingPrice: 399, gstRate: 18, quantity: 60, minStock: 20 },
  { name: 'Triple Strength Omega 3', sku: 'TB-FO-001', category: 'Fish Oil & Omega', brand: 'TrueBasics', flavor: 'Capsules', size: '60 caps', purchasePrice: 700, sellingPrice: 999, gstRate: 18, quantity: 30, minStock: 10 },
  { name: 'Gold Standard Fish Oil', sku: 'ON-FO-001', category: 'Fish Oil & Omega', brand: 'Optimum Nutrition', flavor: 'Capsules', size: '200 caps', purchasePrice: 1500, sellingPrice: 2199, gstRate: 18, quantity: 20, minStock: 5 },
  { name: 'Omega 3 Fish Oil', sku: 'CF-FO-001', category: 'Fish Oil & Omega', brand: 'Carbamide Forte', flavor: 'Capsules', size: '60 caps', purchasePrice: 350, sellingPrice: 549, gstRate: 18, quantity: 45, minStock: 15 },
  { name: 'Deep Sea Omega 3', sku: 'NH-FO-001', category: 'Fish Oil & Omega', brand: 'Neuherbs', flavor: 'Capsules', size: '60 caps', purchasePrice: 500, sellingPrice: 799, gstRate: 18, quantity: 35, minStock: 10 },

  // ========== JOINT SUPPORT ==========
  { name: 'Glucosamine Chondroitin', sku: 'HK-GC-001', category: 'Joint Support', brand: 'HK Vitals', flavor: 'Tablets', size: '60 tabs', purchasePrice: 400, sellingPrice: 649, gstRate: 18, quantity: 35, minStock: 10 },
  { name: 'Joint Support Formula', sku: 'BM-JSF-001', category: 'Joint Support', brand: 'BigMuscles', flavor: 'Capsules', size: '60 caps', purchasePrice: 350, sellingPrice: 549, gstRate: 18, quantity: 40, minStock: 10 },
  { name: 'Collagen Peptides', sku: 'MB-CP-002', category: 'Joint Support', brand: 'MuscleBlaze', flavor: 'Unflavored', size: '250g', purchasePrice: 600, sellingPrice: 899, gstRate: 18, quantity: 25, minStock: 10 },
  { name: 'Joint Care', sku: 'GNC-JC-001', category: 'Joint Support', brand: 'GNC', flavor: 'Tablets', size: '60 tabs', purchasePrice: 800, sellingPrice: 1199, gstRate: 18, quantity: 20, minStock: 5 },

  // ========== PROBIOTICS & DIGESTIVE ==========
  { name: 'Probiotics 10 Billion CFU', sku: 'HK-PRO-001', category: 'Probiotics & Digestive', brand: 'HK Vitals', flavor: 'Capsules', size: '30 caps', purchasePrice: 300, sellingPrice: 499, gstRate: 18, quantity: 45, minStock: 15 },
  { name: 'Digestive Enzymes', sku: 'MB-DE-001', category: 'Probiotics & Digestive', brand: 'MuscleBlaze', flavor: 'Capsules', size: '60 caps', purchasePrice: 400, sellingPrice: 599, gstRate: 18, quantity: 30, minStock: 10 },
  { name: 'LactoBiotic', sku: 'PN-LB-001', category: 'Probiotics & Digestive', brand: 'Pure Nutrition', flavor: 'Capsules', size: '30 caps', purchasePrice: 350, sellingPrice: 549, gstRate: 18, quantity: 40, minStock: 10 },

  // ========== COLLAGEN ==========
  { name: 'Collagen Peptides', sku: 'MB-CP-003', category: 'Collagen', brand: 'MuscleBlaze', flavor: 'Unflavored', size: '250g', purchasePrice: 700, sellingPrice: 999, gstRate: 18, quantity: 25, minStock: 10 },
  { name: 'Marine Collagen', sku: 'HP-MC-001', category: 'Collagen', brand: 'HealthKart', flavor: 'Unflavored', size: '200g', purchasePrice: 600, sellingPrice: 899, gstRate: 18, quantity: 20, minStock: 5 },
  { name: 'Collagen Powder', sku: 'WN-CP-001', category: 'Collagen', brand: 'Wellbeing Nutrition', flavor: 'Unflavored', size: '200g', purchasePrice: 800, sellingPrice: 1199, gstRate: 18, quantity: 15, minStock: 5 },

  // ========== SLEEP & RELAXATION ==========
  { name: 'Melatonin 5mg', sku: 'HK-MEL-001', category: 'Sleep & Relaxation', brand: 'HK Vitals', flavor: 'Tablets', size: '60 tabs', purchasePrice: 200, sellingPrice: 349, gstRate: 18, quantity: 50, minStock: 15 },
  { name: 'L-Theanine 200mg', sku: 'MB-LT-001', category: 'Sleep & Relaxation', brand: 'MuscleBlaze', flavor: 'Capsules', size: '60 caps', purchasePrice: 350, sellingPrice: 549, gstRate: 18, quantity: 30, minStock: 10 },

  // ========== TESTOSTERONE & HORMONE ==========
  { name: 'Tribulus Terrestris', sku: 'MB-TT-001', category: 'Testosterone & Hormone', brand: 'MuscleBlaze', flavor: 'Capsules', size: '60 caps', purchasePrice: 400, sellingPrice: 599, gstRate: 18, quantity: 25, minStock: 10 },
  { name: 'Ashwagandha KSM-66', sku: 'HK-AKW-001', category: 'Testosterone & Hormone', brand: 'HK Vitals', flavor: 'Capsules', size: '60 caps', purchasePrice: 300, sellingPrice: 499, gstRate: 18, quantity: 40, minStock: 15 },

  // ========== HYDRATION & ELECTROLYTES ==========
  { name: 'Electrolyte Powder', sku: 'MB-EP-001', category: 'Hydration & Electrolytes', brand: 'MuscleBlaze', flavor: 'Orange', size: '200g', purchasePrice: 300, sellingPrice: 449, gstRate: 18, quantity: 45, minStock: 15 },
  { name: 'ORS Electrolyte Mix', sku: 'BM-ORS-001', category: 'Hydration & Electrolytes', brand: 'BigMuscles', flavor: 'Lemon', size: '10 sachets', purchasePrice: 150, sellingPrice: 249, gstRate: 18, quantity: 60, minStock: 20 },
  { name: 'Electrolyte Hydration', sku: 'FU-EH-001', category: 'Hydration & Electrolytes', brand: 'Fast&Up', flavor: 'Lemon Lime', size: '200g', purchasePrice: 350, sellingPrice: 549, gstRate: 18, quantity: 40, minStock: 15 },

  // ========== GREENS & SUPERFOODS ==========
  { name: 'Greens Superfood Blend', sku: 'MB-GSB-001', category: 'Greens & Superfoods', brand: 'MuscleBlaze', flavor: 'Berry', size: '250g', purchasePrice: 600, sellingPrice: 899, gstRate: 18, quantity: 30, minStock: 10 },
  { name: 'Apple Cider Vinegar', sku: 'HK-ACV-001', category: 'Greens & Superfoods', brand: 'HK Vitals', flavor: 'Unflavored', size: '500ml', purchasePrice: 250, sellingPrice: 399, gstRate: 18, quantity: 50, minStock: 15 },
  { name: 'Spirulina Tablets', sku: 'HP-SP-001', category: 'Greens & Superfoods', brand: 'HealthKart', flavor: 'Tablets', size: '120 tabs', purchasePrice: 300, sellingPrice: 499, gstRate: 18, quantity: 35, minStock: 10 },

  // ========== PUMP & NITRIC OXIDE ==========
  { name: 'Citrulline Malate', sku: 'NK-CM-002', category: 'Pump & Nitric Oxide', brand: 'NAKPRO', flavor: 'Unflavored', size: '250g', purchasePrice: 400, sellingPrice: 599, gstRate: 18, quantity: 40, minStock: 10 },
  { name: 'NO-Xplode', sku: 'BS-NX-001', category: 'Pump & Nitric Oxide', brand: 'BSN', flavor: 'Fruit Punch', size: '390g', purchasePrice: 2000, sellingPrice: 2999, gstRate: 18, quantity: 15, minStock: 5 },
  { name: 'Pre-Workout Pump', sku: 'MB-PWP-001', category: 'Pump & Nitric Oxide', brand: 'MuscleBlaze', flavor: 'Blue Raspberry', size: '300g', purchasePrice: 700, sellingPrice: 1049, gstRate: 18, quantity: 30, minStock: 10 },

  // ========== PERFORMANCE & ENDURANCE ==========
  { name: 'BCAA Energy', sku: 'MB-BE-001', category: 'Performance & Endurance', brand: 'MuscleBlaze', flavor: 'Tropical Punch', size: '250g', purchasePrice: 700, sellingPrice: 1049, gstRate: 18, quantity: 35, minStock: 10 },
  { name: 'Beta Alanine', sku: 'NK-BA-001', category: 'Performance & Endurance', brand: 'NAKPRO', flavor: 'Unflavored', size: '200g', purchasePrice: 400, sellingPrice: 599, gstRate: 18, quantity: 30, minStock: 10 },
  { name: 'Carb Loader', sku: 'MB-CL-001', category: 'Performance & Endurance', brand: 'MuscleBlaze', flavor: 'Orange', size: '1 kg', purchasePrice: 500, sellingPrice: 749, gstRate: 18, quantity: 25, minStock: 10 },

  // ========== HEALTH ==========
  { name: 'Whey Protein for Her', sku: 'MB-WPH-001', category: 'Health', brand: 'MuscleBlaze', flavor: 'Strawberry', size: '1 kg', purchasePrice: 1500, sellingPrice: 2099, gstRate: 18, quantity: 25, minStock: 10 },
  { name: 'Health Supplement', sku: 'GNC-HS-001', category: 'Health', brand: 'GNC', flavor: 'Capsules', size: '60 caps', purchasePrice: 600, sellingPrice: 899, gstRate: 18, quantity: 30, minStock: 10 },
  { name: 'Omega 3 for Heart', sku: 'HK-OH-001', category: 'Health', brand: 'HK Vitals', flavor: 'Capsules', size: '90 caps', purchasePrice: 400, sellingPrice: 649, gstRate: 18, quantity: 40, minStock: 10 },

  // ========== RECOVERY ==========
  { name: 'Gold Standard Casein', sku: 'ON-GSC-001', category: 'Recovery', brand: 'Optimum Nutrition', flavor: 'Double Rich Chocolate', size: '2 lbs', purchasePrice: 3500, sellingPrice: 4999, gstRate: 18, quantity: 15, minStock: 5 },
  { name: 'ZMA Recovery', sku: 'MB-ZMA-001', category: 'Recovery', brand: 'MuscleBlaze', flavor: 'Capsules', size: '90 caps', purchasePrice: 400, sellingPrice: 599, gstRate: 18, quantity: 35, minStock: 10 },
  { name: 'Glutamine Recovery', sku: 'MB-GR-001', category: 'Recovery', brand: 'MuscleBlaze', flavor: 'Unflavored', size: '500g', purchasePrice: 800, sellingPrice: 1199, gstRate: 18, quantity: 25, minStock: 10 },
]

async function main() {
  console.log(`Seeding ${products.length} products...`)
  
  let count = 0
  for (const product of products) {
    try {
      await prisma.product.create({
        data: {
          tenantId: TENANT_ID,
          name: product.name,
          sku: product.sku,
          category: product.category,
          brand: product.brand,
          flavor: product.flavor || null,
          size: product.size,
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice,
          gstRate: product.gstRate,
          quantity: product.quantity,
          minStock: product.minStock,
          isActive: true,
        },
      })
      count++
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`Failed to create ${product.sku}:`, message)
    }
  }
  
  console.log(`Successfully seeded ${count} products!`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1); })
