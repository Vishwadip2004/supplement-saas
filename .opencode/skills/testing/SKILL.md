---
name: testing
description: Use when writing tests or testable code. Triggers on test files, test setup, writing testable functions.
---

# Testing Skill

## Principles

- Test behavior, not implementation
- Write tests that fail for the right reasons
- One assertion per test when possible
- Tests should be deterministic — no flaky tests

## Test Structure

```
describe('feature/group', () => {
  it('should handle expected behavior', () => {})
  it('should handle edge case', () => {})
  it('should handle error condition', () => {})
})
```

## Naming Convention

- `it('should [expected behavior] when [condition]')`
- `it('returns [expected] when [input]')`
- `it('throws [error] when [invalid input]')`

## What to Test

### API Routes
- Successful responses with correct status codes
- Validation errors for invalid input
- Auth errors for unauthenticated requests
- Authorization errors for wrong roles
- Tenant isolation (cross-tenant access blocked)
- Rate limiting behavior

### Business Logic
- Normal flow
- Edge cases (empty arrays, null values, zero)
- Error conditions (missing data, invalid state)
- Boundary values (min/max, empty/full)

### Components
- Renders correctly with props
- Handles user interactions
- Shows correct state changes

## Test File Location

Place test files next to the source:
```
src/lib/mfa.ts        → src/lib/mfa.test.ts
src/app/api/auth/route.ts → src/app/api/auth/route.test.ts
```

## Mocking Rules

- Mock external services (email, payment, etc.)
- Mock Prisma when testing business logic
- Don't mock the function you're testing
- Use `vi.fn()` for function mocks
- Use `vi.spyOn()` for partial mocks

## Assertions

```typescript
// Values
expect(result).toBe(expected)
expect(result).toEqual(expected)
expect(result).toBeNull()
expect(result).toBeUndefined()

// Truthiness
expect(result).toBeTruthy()
expect(result).toBeFalsy()

// Numbers
expect(result).toBeGreaterThan(0)
expect(result).toHaveLength(3)

// Errors
expect(() => fn()).toThrow(Error)
await expect(fn()).rejects.toThrow(Error)

// Spies
expect(spy).toHaveBeenCalledWith(args)
expect(spy).toHaveBeenCalledTimes(1)
```

## Coverage Targets

- API routes: 100% branch coverage
- Business logic: 90%+ line coverage
- Components: Key user flows covered
