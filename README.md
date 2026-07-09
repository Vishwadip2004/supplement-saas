# SupplementShop Pro

Secure SaaS application for supplement shop stock management built with Next.js 16, TypeScript, Prisma, and PostgreSQL.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth v4 (JWT) |
| Styling | Tailwind CSS v4 |
| Validation | Zod |
| Security | AES-256-GCM encryption, audit logging, rate limiting |

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon, Supabase, or local)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/Vishwadip2004/supplement-saas.git
cd supplement-saas
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database URL and secrets

# 3. Generate secrets (if needed)
openssl rand -base64 32  # Use for NEXTAUTH_SECRET
openssl rand -base64 32  # Use for ENCRYPTION_KEY
openssl rand -hex 16     # Use for ENCRYPTION_SALT

# 4. Push schema and seed
npm run db:push
npm run db:seed

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@supplement.com | Admin123!@#$ |
| Manager | manager@supplement.com | Manager123!@#$ |
| Staff | staff@supplement.com | Staff123!@#$ |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # Backend API routes
│   │   ├── auth/           # Authentication (login, register)
│   │   ├── products/       # Product CRUD
│   │   ├── customers/      # Customer management
│   │   ├── sales/          # Sales transactions
│   │   ├── suppliers/      # Supplier management
│   │   └── reports/        # Dashboard stats
│   ├── auth/               # Auth pages (login, register)
│   ├── dashboard/          # Dashboard pages
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/             # Reusable UI components
│   ├── layout/             # DashboardLayout, Sidebar
│   └── ui/                 # Button, Card, Input
├── lib/                    # Core libraries
│   ├── prisma.ts           # Database client
│   ├── cors.ts             # CORS utilities
│   └── security/           # Security modules
│       ├── audit.ts        # Audit logging
│       ├── config.ts       # Central config
│       ├── encryption.ts   # AES-256-GCM
│       ├── rateLimit.ts    # Rate limiting
│       └── validation.ts   # Zod schemas
├── middleware.ts            # Auth guard + security headers
├── types/                  # TypeScript interfaces
└── utils/                  # Helper functions
```

## Key Features

- **Product Management** — CRUD with SKU, expiry tracking, batch numbers, low stock alerts
- **Sales Tracking** — Record sales with automatic stock decrement and movement logging
- **Customer & Supplier Management** — Contact database with search and pagination
- **Dashboard & Reports** — Real-time stats, today's sales, recent activity
- **Role-Based Access** — ADMIN, MANAGER, STAFF with different permissions
- **Security** — AES-256 encryption, audit logs, rate limiting, CSP headers, soft deletes

## API Routes

All routes require session auth (except `/api/auth/register` and `/api/auth/*`).

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/auth/register` | Create account | Public |
| GET | `/api/products` | List products | All |
| POST | `/api/products` | Create product | ADMIN, MANAGER |
| GET | `/api/products/[id]` | Get product | All |
| PUT | `/api/products/[id]` | Update product | ADMIN, MANAGER |
| DELETE | `/api/products/[id]` | Soft-delete product | ADMIN, MANAGER |
| GET | `/api/customers` | List customers | All |
| POST | `/api/customers` | Create customer | ADMIN, MANAGER |
| GET | `/api/sales` | List sales | All |
| POST | `/api/sales` | Record sale | All |
| GET | `/api/suppliers` | List suppliers | ADMIN, MANAGER |
| GET | `/api/reports` | Dashboard stats | ADMIN, MANAGER |

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema to database
npm run db:seed      # Seed with sample data
npm run db:reset     # Reset and re-seed database
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret |
| `NEXTAUTH_URL` | Yes | App URL (http://localhost:3000 for dev) |
| `ENCRYPTION_KEY` | Yes | AES-256 encryption key |
| `ENCRYPTION_SALT` | Yes | Hex-encoded salt for key derivation |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL for CORS |

## License

Private
