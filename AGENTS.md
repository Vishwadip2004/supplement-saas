# SupplementShop Pro

## Project Overview
Secure SaaS application for supplement shop stock management.

## Tech Stack
- **Framework**: Next.js 16 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth with JWT
- **Styling**: Tailwind CSS
- **Security**: AES-256 encryption, audit logging, rate limiting

## Key Features
- Multi-tenant SaaS architecture
- Product management with expiry tracking
- Sales and inventory tracking
- User roles (Admin, Manager, Staff)
- Audit logging for all actions
- MFA authentication

## Security Requirements
- All inputs validated with Zod
- Sensitive data encrypted (AES-256-GCM)
- Rate limiting on all APIs
- CSRF/XSS protection
- 12+ character passwords with complexity

## Project Structure
```
src/
├── app/          # Pages & API routes
├── components/   # Reusable UI components
├── lib/          # Core libraries (security, prisma)
├── types/        # TypeScript types
└── utils/        # Helper functions
```

## Running the Project
```bash
npm run dev      # Start dev server
npx prisma db push  # Sync database
```
