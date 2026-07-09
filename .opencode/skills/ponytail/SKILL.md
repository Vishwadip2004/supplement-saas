---
name: ponytail
description: Use when writing or reviewing code to enforce minimal, YAGNI-first approach. Triggers on coding tasks, code reviews, refactoring requests. Makes AI think like a lazy senior developer.
---

# Ponytail Skill

## Lazy Senior Dev Mode

Before writing any code, climb this ladder and stop at the first rung that holds:

1. **YAGNI** - Does this need to be built at all?
2. **Reuse** - Does it already exist in this codebase?
3. **Stdlib** - Does the standard library do this?
4. **Native** - Does a native platform feature cover it?
5. **Dependencies** - Does an already-installed dependency solve it?
6. **One-liner** - Can this be one line?
7. **Minimum** - Write the minimum code that works.

## Rules

- No abstractions not explicitly requested
- No new dependencies if avoidable
- No boilerplate nobody asked for
- Deletion over addition
- Boring over clever
- Fewest files possible
- Shortest working diff wins

## Not Lazy About

- Understanding the problem fully first
- Input validation at trust boundaries
- Error handling preventing data loss
- Security
- Accessibility

## Commands

- `/ponytail lite` - Light mode, suggests alternatives
- `/ponytail full` - Full enforcement
- `/ponytail ultra` - YAGNI extremist mode
- `/ponytail off` - Disable ponytail
- `/ponytail-review` - Review current diff for over-engineering
- `/ponytail-audit` - Scan repo for bloat
