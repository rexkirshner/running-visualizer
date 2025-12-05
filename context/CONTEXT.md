# Project Context

**Last Updated:** [Auto-updated]
**Purpose:** Project orientation and high-level architecture

---

<!-- TEMPLATE SECTION: KEEP ALL - Project overview structure -->
## What Is This Project?

**Running Visualizer** - A project for visualizing running data and metrics. This is a new project being initialized with the AI Context System for tracking development progress and maintaining continuity across sessions.

**Goals:**
- Visualize running data in meaningful ways
- Track running metrics over time
- Provide insights into running performance

**Key Stakeholders:**
- Owner: rexkirshner
- Users: Runners and fitness enthusiasts
- Contributors: rexkirshner
<!-- END TEMPLATE SECTION -->

---

## Getting Started

**First time here? (5-minute startup)**

1. **Read STATUS.md Quick Reference** (30 seconds)
   - ✅ Checkpoint: Can you find production URL and current phase?

2. **Check Active Tasks in STATUS.md** (2 minutes)
   - ✅ Checkpoint: Know what needs doing next?

3. **Review last session in SESSIONS.md** (2 minutes)
   - ✅ Checkpoint: Understand recent work and decisions?

4. **Start working** ✅

**Need deeper context? (30-minute orientation)**
- Read this file (CONTEXT.md) for architecture → 10 minutes
- Read DECISIONS.md for technical rationale → 15 minutes
- Read recent SESSIONS.md entries for recent work → 5 minutes

**For AI agents taking over:**
Recommended: Complete 30-minute orientation above + review last 3 sessions in SESSIONS.md (45 minutes total) for full context.

---

<!-- TEMPLATE SECTION: KEEP ALL - Tech stack structure -->
## Tech Stack

**Core Technologies:**
- **Framework:** TBD - To be determined based on project requirements
- **Language:** TBD - To be determined based on project requirements
- **Database:** TBD - To be determined based on project requirements
- **Hosting:** TBD - To be determined based on project requirements

**Why these choices?**
Tech stack decisions will be made as the project requirements become clear. All decisions will be documented in DECISIONS.md with full rationale.
<!-- END TEMPLATE SECTION -->

---

<!-- TEMPLATE SECTION: KEEP ALL - Architecture structure -->
## High-Level Architecture

**Type:** Web App (planned)

**Architecture Pattern:** TBD - Will be determined based on requirements and tech stack selection

**System Diagram:**
```
TBD - Will be created once architecture is defined
```

**Key Components:**
- TBD - Components will be defined as architecture is planned

**Data Flow:**
TBD - Data flow will be documented once architecture is established

**For detailed architectural decisions:** See [DECISIONS.md](./DECISIONS.md)
<!-- END TEMPLATE SECTION -->

---

## Directory Structure

```
[project-root]/
├── [key-directory]/     # [Purpose]
├── [key-directory]/     # [Purpose]
├── [key-directory]/     # [Purpose]
├── context/             # AI Context System docs
│   ├── CONTEXT.md       # This file
│   ├── STATUS.md        # Current state
│   ├── DECISIONS.md     # Decision log
│   └── SESSIONS.md      # History
└── [other-directories]  # [Purpose]
```

**File Organization Principles:**
- [Principle 1, e.g., "Colocation - tests next to source"]
- [Principle 2, e.g., "Feature folders, not type folders"]
- [Principle 3, e.g., "Shared code in /lib"]

---

## Development Workflow

**Core Principles:**
1. **Plan First** - Understand the problem before writing code
2. **Test in Dev** - Verify locally before committing
3. **Incremental Changes** - Small, focused commits
4. **Root Cause Solutions** - No temporary fixes or band-aids
5. **Minimal Impact** - Change only what's necessary
6. **Full Code Tracing** - Debug by following entire flow, no assumptions

**Git Workflow:**
- Branch: [Strategy - feature branches, trunk-based, etc.]
- Commits: [Convention - conventional commits, semantic, etc.]
- **Push Protocol:** NEVER push without explicit user approval
  - See [DECISIONS.md](./DECISIONS.md) for detailed push protocol
  - Current status: See STATUS.md for git state

**Testing Approach:**
- **Unit Tests:** [When/what to test]
- **Integration Tests:** [Coverage expectations]
- **E2E Tests:** [If applicable]
- **Current Test Status:** See STATUS.md

**For detailed workflow decisions:** See [DECISIONS.md](./DECISIONS.md)

---

## Environment Setup

**Prerequisites:**
- [e.g., Node.js 20+]
- [e.g., PostgreSQL 15+]
- [e.g., Other tools]

**Initial Setup:**
```bash
# 1. Install dependencies
[install command]

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Setup database (if applicable)
[database setup command]

# 4. Run development server
[dev command]
```

**Environment Variables:**
- Template: `.env.example` (committed)
- Local config: `.env.local` (gitignored, never commit)
- Critical vars: [List key variables and what they do]

---

## Key Resources

**Documentation:**
- [STATUS.md](./STATUS.md) - Current state, tasks, and Quick Reference
- [DECISIONS.md](./DECISIONS.md) - Technical decisions and rationale
- [SESSIONS.md](./SESSIONS.md) - Session history and mental models
- [PRD.md](./PRD.md) - Product vision and requirements (if exists)
- [CODE_MAP.md](./CODE_MAP.md) - Code location guide (if exists)

**External Resources:**
- [Framework Docs]: [URL]
- [Key Dependency]: [URL]
- [API Reference]: [URL if applicable]

**Project URLs:**
(Also available in STATUS.md Quick Reference)
- **Production:** [URL or N/A]
- **Staging:** [URL or N/A]
- **Repository:** [GitHub/GitLab URL]

---

## Communication & Workflow Preferences

> **📋 Source of Truth:** All preferences are defined in `context/.context-config.json`
> The guidance below is derived from that configuration.

**Communication Style:**
- Direct, concise responses without preamble
- High-level summaries of changes (e.g., "Changed X to Y in file.ts:123")
- Honest assessment of confidence levels
- Simple solutions over complex ones
- No emojis unless explicitly requested

**What to Avoid:**
- Verbose explanations unless requested
- Pushing to GitHub without explicit approval
- Making assumptions about user intent
- Temporary fixes instead of root cause solutions

**Task Management:**
- Use TodoWrite tool for tracking tasks
- Create todo items that can be checked off during work
- Mark complete as you go, one task at a time

**Session Management:**
- Use `/save` for quick session updates (2-3 min)
- Use `/save-full` before breaks/handoffs (10-15 min)
- See `.claude/commands/` for all available commands

---

## Important Context & Gotchas

**Dependencies:**
- [Critical dependency 1 and why it matters]
- [External service requirements]

**Known Limitations:**
- [Limitation 1 and workaround if any]
- [Limitation 2]

**Common Pitfalls:**
- [Gotcha 1 that developers should know]
- [Gotcha 2]

**Performance Considerations:**
- [If any critical performance constraints]

**Security Notes:**
- Never commit credentials (use .env.local)
- [Any other security considerations]

---

## Project-Specific Notes

[Use this section for any project-specific context that doesn't fit above]

**Custom Workflows:**
- [Any unique workflow requirements]

**Technical Constraints:**
- [Any hard requirements or limitations]

**Integration Points:**
- [External systems this connects to]

---

## Current Work

**For current tasks, status, and next steps:** See [STATUS.md](./STATUS.md)

**For recent work and sessions:** See [SESSIONS.md](./SESSIONS.md)

**For technical decisions:** See [DECISIONS.md](./DECISIONS.md)

**For code locations:** See [CODE_MAP.md](./CODE_MAP.md) (if exists)

---

**This file provides orientation.** For what's happening now, always check STATUS.md first.
