<!-- TEMPLATE: READ-ONLY - This file contains instructions for Claude AI. Do not modify this file. -->
# Claude Context

**📍 Start here:** [CONTEXT.md](./CONTEXT.md)

This project uses the AI Context System v3.0. All documentation is in platform-neutral markdown files.

**Quick start:** [STATUS.md](./STATUS.md) → Active Tasks → Begin working

---

## 🔴 Critical Protocol: Git Push Permission

**NEVER push to GitHub without EXPLICIT approval for EACH push.**

**Commit ≠ Push:**
- User says **"commit"** → ONLY commit locally, then STOP
- User says **"push"** or **"commit and push"** → OK to push

**Permission NEVER carries forward:**
- Approval for one push does NOT apply to future pushes
- EACH git push requires NEW explicit approval

**See:** [command-philosophy.md](../.claude/docs/command-philosophy.md#2-user-approval-for-destructive-actions)

---

## 📋 Decision Documentation

**Proactively document significant decisions in DECISIONS.md**

When making architectural, technical, or process decisions, ask:

**"This appears to be an architectural decision. Should I document this in DECISIONS.md?"**

### Examples of Decisions to Capture

**Library/Framework Choices:**
- "Why Zod over Yup for validation?"
- "Why Sentry for error tracking?"
- "Why Tailwind over CSS-in-JS?"

**Performance Strategies:**
- "Why React.memo for list components?"
- "Why DESC indexes on date columns?"
- "Why async validation over sync?"

**Data Model Changes:**
- "Why separate table for user preferences?"
- "Why NoSQL over SQL for this feature?"
- "Why normalize vs. denormalize?"

**Security Approaches:**
- "Why structured logging over console.log?"
- "Why JWT over session cookies?"
- "Why encrypt PII at application layer?"

**Process Changes:**
- "Why switch from feature branches to trunk-based?"
- "Why add pre-commit hooks?"
- "Why change deployment strategy?"

### DECISIONS.md Format

```markdown
### D003 | Performance Strategy | 2025-11-10

**Decision**: Use React.memo for list components rendering >100 items

**Why**: Testing showed 300ms render time for TransactionsList without memoization.
React.memo reduced to 45ms (85% improvement).

**Trade-offs**:
- ✅ Dramatic performance improvement for large lists
- ❌ Slight complexity increase (need to understand memoization)
- ✅ Shallow equality check sufficient for our use case

**Status**: ✅ Implemented (Session 14)
```

### When NOT to Document

**Skip documentation for:**
- Trivial code decisions (variable naming, formatting)
- Obvious bug fixes
- Standard patterns already in CODE_STYLE.md
- Following existing architectural patterns

**Focus on:** Decisions that future developers (or AI agents) will wonder about.

<!-- END READ-ONLY TEMPLATE -->
