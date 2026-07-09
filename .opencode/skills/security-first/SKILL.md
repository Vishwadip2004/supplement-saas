---
name: security-first
description: Use when writing or reviewing code to enforce security best practices. Triggers on API routes, auth flows, database queries, user input handling.
---

# Security-First Skill

## Trust Nothing

Every input is hostile until proven otherwise. Check everything at the boundary.

## Rules

### Authentication & Authorization
- Always verify session before accessing protected routes
- Check `tenantId` on every query — never trust client-provided tenant context
- Validate user roles explicitly, don't assume defaults
- Use `getServerSession(authOptions)` in API routes, not client-side checks

### Input Validation
- Validate all inputs with Zod at every API boundary
- Reject unknown fields — use `.strict()` when appropriate
- Sanitize strings before DB queries (Prisma handles this, but be aware)
- Validate file uploads: type, size, and content

### Data Protection
- Never return passwords or secrets in API responses
- Encrypt sensitive data at rest (use `getEncryption()`)
- Use parameterized queries (Prisma does this by default)
- Don't log sensitive data (passwords, tokens, secrets)

### API Security
- Rate limit all endpoints (use `checkRateLimit`)
- Add CORS headers to all responses (use `setCorsHeaders`)
- Validate Content-Type on POST/PUT requests
- Return generic errors to clients, log details server-side

### Session & Auth
- Use HTTP-only, secure cookies for session tokens
- Set appropriate `sameSite` policy
- Implement account lockout after failed attempts
- Log all auth events (login, register, MFA)

### Common Vulnerabilities
- **SQL Injection**: Prisma prevents this — never use raw queries without parameterization
- **XSS**: React escapes by default — don't use `dangerouslySetInnerHTML`
- **CSRF**: NextAuth handles this — ensure cookies are configured correctly
- **IDOR**: Always verify `tenantId` matches the session user's tenant
- **Price Manipulation**: Derive prices server-side, never trust client-provided prices

### Secrets Management
- Never commit secrets to git
- Use environment variables for all secrets
- Validate required env vars at startup
- Rotate secrets periodically

## Checklist for New Features

Before writing code, ask:
1. Is this endpoint authenticated?
2. Is tenant isolation enforced?
3. Are all inputs validated?
4. Are errors handled without leaking info?
5. Is audit logging in place?
6. Are rate limits applied?
7. Are secrets handled securely?
