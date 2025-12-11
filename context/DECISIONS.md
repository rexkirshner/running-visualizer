# DECISIONS.md

**Decision log** - WHY choices were made. **Critical for AI agent review and takeover.**

**For current status:** See `STATUS.md`
**For session history:** See `SESSIONS.md`

---

## Why This File Exists

AI agents reviewing your code need to understand:
- **WHY** you made certain technical choices
- What **constraints** influenced decisions
- What **alternatives** you considered and rejected
- What **tradeoffs** you accepted

This file captures the reasoning that isn't obvious from code alone.

---

## Decision Template

```markdown
## [Decision ID] - [Decision Title]

**Date:** [YYYY-MM-DD]
**Status:** Accepted / Superseded / Reconsidering
**Session:** [Session number]

### Context

[What problem are we solving? What constraints exist?]

### Decision

[What did we decide to do?]

### Rationale

[WHY did we choose this approach?]

**Key factors:**
- [Factor 1]
- [Factor 2]

### Alternatives Considered

1. **[Alternative 1]**
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Why not: [Reason for rejection]

2. **[Alternative 2]**
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Why not: [Reason for rejection]

### Tradeoffs Accepted

- ✅ [What we gain]
- ❌ [What we give up]

### Consequences

**Positive:**
- [Good outcome 1]
- [Good outcome 2]

**Negative:**
- [Limitation 1]
- [Limitation 2]

### When to Reconsider

[Under what conditions should we revisit this decision?]

**Triggers:**
- [Trigger 1]
- [Trigger 2]

### Related

- See: `SESSIONS.md` Session [N]
- See: `ARCHITECTURE.md` [Section]
- Related decisions: [IDs]

**For AI agents:** [Any additional context AI needs to understand this decision]

---
```

## Example Decision

## D001 - Use PostgreSQL over MongoDB

**Date:** 2025-01-15
**Status:** Accepted
**Session:** 3

### Context

Need to choose database for user data, posts, and relationships. Requirements:
- Complex queries (joins across user/post/comment tables)
- ACID guarantees for financial data
- Mature ecosystem with good TypeScript support

### Decision

Use PostgreSQL with Prisma ORM instead of MongoDB.

### Rationale

**Key factors:**
- Relational data model fits our use case (users, posts, comments, relationships)
- Need ACID transactions for payment processing
- Complex joins required for social graph queries
- Team has PostgreSQL experience

### Alternatives Considered

1. **MongoDB**
   - Pros: Flexible schema, horizontal scaling, good for rapid iteration
   - Cons: No ACID across collections, complex joins expensive, harder to model relationships
   - Why not: Our data is inherently relational, need strong consistency

2. **MySQL**
   - Pros: Mature, well-known, good performance
   - Cons: Less advanced features than PostgreSQL, weaker JSON support
   - Why not: PostgreSQL's JSONB and array types give us flexibility without losing structure

### Tradeoffs Accepted

- ✅ Strong consistency, ACID guarantees, excellent query capabilities
- ❌ Vertical scaling limitations, less flexible schema changes

### Consequences

**Positive:**
- Can enforce referential integrity at DB level
- Complex social graph queries are performant
- Prisma provides type-safe database access

**Negative:**
- Schema migrations require planning
- Horizontal scaling requires sharding (complex)

### When to Reconsider

**Triggers:**
- Scale beyond single PostgreSQL instance capacity (>10M users)
- Need multi-region writes with eventual consistency
- Data model becomes truly document-oriented

### Related

- See: `ARCHITECTURE.md` Database Layer
- See: `SESSIONS.md` Session 3

**For AI agents:** This decision prioritizes consistency and relational integrity over scaling flexibility. The team values strong typing and schema enforcement. If reviewing for scale optimization, consider read replicas before suggesting NoSQL alternatives.

---

## D002 - PNG Sequence Export over Video

**Date:** 2025-12-11
**Status:** Accepted
**Session:** 7

### Context

User wants to export route animations for use in Final Cut Pro. Requirements:
- Transparent background (routes overlay on other content)
- High quality output (up to 4K)
- Variable frame rate support (24/30/60fps)
- Browser-based export (no server processing)

### Decision

Use PNG image sequence export with JSZip packaging instead of video export (WebM/MP4).

### Rationale

**Key factors:**
- H.264/MP4 codec does not support alpha (transparency)
- PNG provides lossless quality with full alpha channel
- Image sequences are native to video editing workflows
- No codec compatibility issues across platforms

### Alternatives Considered

1. **WebM with VP9 alpha**
   - Pros: Single file, supports transparency, good compression
   - Cons: Poor FCP support, codec compatibility issues
   - Why not: Final Cut Pro doesn't natively import WebM

2. **MP4 with H.264**
   - Pros: Universal compatibility, small file size
   - Cons: No transparency support
   - Why not: User explicitly needs transparent background

3. **ProRes 4444 MOV**
   - Pros: FCP native, supports alpha, high quality
   - Cons: ffmpeg.wasm doesn't include ProRes encoder
   - Why not: Technical limitation of browser-based ffmpeg

### Tradeoffs Accepted

- ✅ Perfect transparency support, lossless quality, easy FCP import
- ❌ Larger file sizes (uncompressed PNGs), requires unzipping before import

### Consequences

**Positive:**
- Works perfectly with Final Cut Pro workflow
- No quality loss from video compression
- User can adjust frame rate during FCP import
- Resolution up to 4K supported

**Negative:**
- ZIP files can be large (hundreds of MB for 4K exports)
- Extra step to unzip before importing to editor
- Memory usage during capture (all frames in memory)

### When to Reconsider

**Triggers:**
- Browser supports ProRes encoding in ffmpeg.wasm
- WebM with alpha becomes FCP-compatible
- Memory issues with very long animations at high resolution

### Related

- See: `SESSIONS.md` Session 7
- See: `src/utils/videoExport.js` PNGSequenceRecorder class

**For AI agents:** This decision prioritizes transparency and FCP compatibility over file size. The user is a video editor who needs to composite route animations. If they later request smaller files and don't need transparency, consider adding MP4 export as an option.

---

## Active Decisions

| ID | Title | Date | Status |
|----|-------|------|--------|
| D001 | PostgreSQL over MongoDB | 2025-01-15 | ✅ Accepted (example) |
| D002 | PNG Sequence Export over Video | 2025-12-11 | ✅ Accepted |

---

## Superseded Decisions

| ID | Title | Date | Superseded By | Reason |
|----|-------|------|---------------|--------|
| - | - | - | - | - |

---

## Guidelines for AI Agents

When reviewing this file:
1. **Respect the context** - Decisions were made with specific constraints
2. **Check for changes** - Have triggers occurred that warrant reconsideration?
3. **Understand tradeoffs** - Don't suggest alternatives without acknowledging accepted tradeoffs
4. **Consider evolution** - Projects evolve, early decisions may need revisiting
5. **Ask before suggesting reversals** - Major architectural changes need user approval

When taking over development:
1. Read ALL decisions before making architectural changes
2. Understand WHY current approach exists
3. Check "When to Reconsider" sections for current relevance
4. Respect constraints that may still apply
5. Document new decisions in same format
