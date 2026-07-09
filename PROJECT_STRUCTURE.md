# SupplementShop Pro - Project Structure

## Overview
Secure SaaS application for supplement shop stock management.

## Folder Structure

```
supplement-saas/
├── prisma/                  # Database schema and migrations
│   └── schema.prisma        # Database models and enums
├── src/
│   ├── app/                 # Next.js App Router (pages & API)
│   │   ├── api/             # Backend API endpoints
│   │   │   ├── auth/        # Authentication (login, register)
│   │   │   ├── products/    # Product CRUD
│   │   │   ├── customers/   # Customer management
│   │   │   ├── sales/       # Sales transactions
│   │   │   ├── suppliers/   # Supplier management
│   │   │   └── reports/     # Dashboard statistics
│   │   ├── auth/            # Auth pages (login, register)
│   │   ├── dashboard/       # Dashboard pages
│   │   └── layout.tsx       # Root layout
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Button, Card, Input
│   │   └── layout/          # DashboardLayout, Sidebar
│   ├── lib/                 # Core libraries
│   │   ├── prisma.ts        # Database client
│   │   ├── cors.ts          # CORS utilities
│   │   └── security/        # Security modules
│   │       ├── audit.ts     # Audit logging
│   │       ├── config.ts    # Central configuration
│   │       ├── encryption.ts # AES-256-GCM encryption
│   │       ├── rateLimit.ts # Rate limiting with TTL
│   │       └── validation.ts # Zod schemas
│   ├── middleware.ts         # Auth guard + security headers
│   ├── types/               # TypeScript interfaces
│   └── utils/               # Helper functions (cn, formatCurrency, etc.)
├── public/                  # Static assets
├── .env.example             # Environment variables template
└── package.json             # Dependencies
```

## Key Files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Auth guard, security headers (CSP, HSTS, etc.) |
| `src/lib/prisma.ts` | Singleton Prisma client with PostgreSQL adapter |
| `src/lib/security/encryption.ts` | AES-256-GCM encrypt/decrypt |
| `src/lib/security/audit.ts` | Audit trail logging |
| `src/lib/security/validation.ts` | Zod schemas for all entities |
| `src/lib/security/rateLimit.ts` | IP-based rate limiting with TTL cleanup |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `prisma/schema.prisma` | Database models and enums |

## API Route Pattern

Every API route follows this structure:
```typescript
export async function GET(request: Request) {
  // 1. Rate limit check
  // 2. Session auth check
  // 3. Role authorization (if needed)
  // 4. Input validation (Zod)
  // 5. Database operation
  // 6. Audit log
  // 7. CORS headers
  // 8. Response
}
```

## Adding New Features

1. **New API endpoint**: Create `src/app/api/[feature]/route.ts`
2. **New page**: Create `src/app/dashboard/[feature]/page.tsx`
3. **New component**: Create `src/components/[feature]/Component.tsx`
4. **New type**: Add to `src/types/index.ts`
5. **New Zod schema**: Add to `src/lib/security/validation.ts`

## Security Notes

- All inputs validated with Zod schemas
- Sensitive data encrypted with AES-256-GCM
- All actions logged to audit trail
- Rate limiting on all API endpoints
- CSP, HSTS, and other security headers via middleware
- Soft deletes for products, customers, suppliers
- Role-based access control (ADMIN, MANAGER, STAFF)
