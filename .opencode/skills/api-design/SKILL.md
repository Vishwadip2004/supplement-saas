---
name: api-design
description: Use when designing or building API endpoints. Triggers on route handlers, API structure, request/response design.
---

# API Design Skill

## RESTful Conventions

| Method | Action | Example |
|--------|--------|---------|
| GET | List/Read | `GET /api/products` |
| POST | Create | `POST /api/products` |
| GET | Read one | `GET /api/products/:id` |
| PUT | Update | `PUT /api/products/:id` |
| DELETE | Soft delete | `DELETE /api/products/:id` |

## Response Format

### Success
```json
// Single item
{ "id": "123", "name": "Product" }

// List with pagination
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

### Error
```json
{
  "error": "Human-readable message",
  "details": { "field": "error details" }
}
```

## Status Codes

- `200` — Success
- `201` — Created
- `400` — Validation error
- `401` — Not authenticated
- `403` — Not authorized
- `404` — Not found
- `409` — Conflict (duplicate)
- `429` — Rate limited
- `500` — Server error

## Route Structure

```
src/app/api/
├── auth/
│   ├── [...nextauth]/route.ts    # NextAuth handler
│   ├── register/route.ts         # Registration
│   └── mfa/                      # MFA endpoints
├── products/
│   ├── route.ts                  # GET (list), POST (create)
│   └── [id]/route.ts             # GET, PUT, DELETE
├── sales/
│   ├── route.ts
│   └── [id]/route.ts
└── reports/route.ts              # Aggregation endpoints
```

## Middleware Pattern

Every API route should follow this order:
1. Rate limit check
2. Session/auth check
3. Role/permission check
4. Input validation
5. Business logic
6. Audit logging
7. Response with CORS headers

## Naming

- Use plural nouns: `/products`, not `/product`
- Use kebab-case for multi-word: `/stock-movements`
- Use query params for filtering: `?search=whey&category=protein`
- Use path params for specific resources: `/products/:id`

## Input Validation

- Validate at the boundary — first thing after auth
- Use Zod schemas from `@/lib/security/validation`
- Return structured error responses
- Never trust client-provided IDs for ownership checks

## Tenant Isolation

Every query must include `tenantId`:
```typescript
const tenantId = extractTenantId(session)
const items = await prisma.item.findMany({
  where: { tenantId, ...otherFilters }
})
```

## CORS

Apply CORS to all responses:
```typescript
const response = NextResponse.json(data)
return setCorsHeaders(response, request.headers.get('origin'))
```
