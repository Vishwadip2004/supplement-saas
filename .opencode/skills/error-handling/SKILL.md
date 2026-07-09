---
name: error-handling
description: Use when writing error handling code. Triggers on try/catch, error responses, error logging.
---

# Error Handling Skill

## Principles

1. Never swallow errors silently
2. Log errors with context for debugging
3. Return generic messages to clients
4. Handle errors at the right boundary

## API Route Pattern

```typescript
export async function GET(request: Request) {
  try {
    // Business logic
    const result = await doSomething()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to do something:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Error Types

### Operational Errors (Expected)
- Validation failures → `400`
- Not found → `404`
- Unauthorized → `401`
- Forbidden → `403`
- Conflict → `409`

### Programmer Errors (Unexpected)
- Null reference → Log and return `500`
- Database connection failure → Log and return `500`
- Missing env var → Fail fast at startup

## What to Log

```typescript
// Good — enough context to debug
console.error('Failed to create product:', error)

// Bad — no context
console.error(error)
```

Log:
- What operation failed
- Relevant IDs (but not secrets)
- Error message and stack trace

## What NOT to Log

- Passwords or secrets
- Full credit card numbers
- Session tokens
- Personal identifiable information (PII)

## Error Response Rules

1. Always return JSON, even for errors
2. Use consistent error shape: `{ error: string }`
3. Never expose stack traces to clients
4. Never expose database error messages
5. Include request ID for support (if available)

## Validation Errors

Return structured details:
```json
{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "password": "Must be at least 12 characters"
  }
}
```

## Auth Errors

Don't reveal whether user exists:
```typescript
// Bad
if (!user) return { error: 'User not found' }
if (!isValid) return { error: 'Wrong password' }

// Good
if (!user || !isValid) return { error: 'Invalid credentials' }
```

## Cleanup

Always clean up resources in error paths:
```typescript
let resource
try {
  resource = await createResource()
  await doSomethingThatMightFail(resource)
} catch (error) {
  if (resource) await cleanupResource(resource)
  throw error
}
```

Or use `finally`:
```typescript
const resource = await createResource()
try {
  await doSomethingThatMightFail(resource)
} finally {
  await cleanupResource(resource)
}
```
