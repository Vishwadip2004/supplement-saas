---
name: performance
description: Use when writing code that affects performance. Triggers on database queries, loops, rendering, data processing.
---

# Performance Skill

## Database Queries

### N+1 Prevention
- Always use `include` or `select` for related data
- Use `Promise.all()` for independent queries
- Avoid loops that make DB calls — batch instead

```typescript
// Bad
for (const item of items) {
  await prisma.related.findMany({ where: { itemId: item.id } })
}

// Good
const relatedItems = await prisma.related.findMany({
  where: { itemId: { in: items.map(i => i.id) } }
})
```

### Pagination
- Always paginate large result sets
- Use cursor-based pagination for infinite scroll
- Limit default page size (20-50 items)

### Indexing
- Add indexes on frequently queried columns
- Use composite indexes for multi-column queries
- Index foreign keys

## React/Next.js

### Client Components
- Keep client components small and focused
- Pass only needed data as props
- Use `React.memo()` for expensive renders
- Debounce rapid state changes (search, resize)

### Data Fetching
- Use `useEffect` cleanup to prevent state updates on unmounted components
- Abort fetch requests when component unmounts
- Cache API responses when appropriate

### Rendering
- Avoid inline functions in JSX — define outside or use `useCallback`
- Use `key` prop correctly — never use index for dynamic lists
- Lazy load components below the fold

## General

### Loops
- Prefer `map`/`filter`/`reduce` over `for` loops
- Break early from loops when possible
- Avoid expensive operations in tight loops

### Caching
- Cache expensive computations with `useMemo`
- Cache function references with `useCallback`
- Don't cache everything — profile first

### Bundle Size
- Import only what you need: `import { pick } from 'lodash'`
- Use dynamic imports for heavy components
- Avoid barrel exports from large modules

## Measurement

Before optimizing, measure:
1. `console.time()` for quick checks
2. React DevTools Profiler for renders
3. Network tab for API response times
4. Prisma query logs for DB performance
