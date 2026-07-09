# SupplementShop Pro - Project Structure

## Overview
Secure SaaS application for supplement shop stock management.

## Folder Structure

```
supplement-saas/
├── prisma/                  # Database schema and migrations
│   └── schema.prisma        # Database models
├── src/
│   ├── app/                 # Next.js App Router (pages & API)
│   │   ├── api/             # Backend API endpoints
│   │   │   ├── auth/        # Authentication routes
│   │   │   ├── products/    # Product CRUD
│   │   │   ├── customers/   # Customer management
│   │   │   ├── sales/       # Sales transactions
│   │   │   └── suppliers/   # Supplier management
│   │   ├── auth/            # Auth pages (login, register)
│   │   ├── dashboard/       # Main dashboard
│   │   ├── products/        # Product pages
│   │   └── layout.tsx       # Root layout
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Basic buttons, inputs, etc.
│   │   ├── layout/          # Header, Sidebar, etc.
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── products/        # Product-related components
│   │   └── auth/            # Auth form components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Core libraries
│   │   ├── prisma.ts        # Database client
│   │   └── security/        # Security utilities
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helper functions
├── public/                  # Static assets
├── .env.example             # Environment variables template
└── package.json             # Dependencies
```

## Key Files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Security headers, rate limiting |
| `src/lib/security/encryption.ts` | Data encryption/decryption |
| `src/lib/security/audit.ts` | Audit logging |
| `src/lib/security/validation.ts` | Input validation with Zod |
| `prisma/schema.prisma` | Database schema |

## Adding New Features

1. **New API endpoint**: Create `src/app/api/[feature]/route.ts`
2. **New page**: Create `src/app/[feature]/page.tsx`
3. **New component**: Create `src/components/[feature]/[Component].tsx`
4. **New type**: Add to `src/types/[feature].ts`

## Security Notes

- All inputs validated with Zod schemas
- Sensitive data encrypted with AES-256-GCM
- All actions logged to audit trail
- Rate limiting on all API endpoints
- CSRF, XSS, and SQL injection protection
