# task-manager Constitution

## Core Principles

### I. Mobile-First, Android-Only (NON-NEGOTIABLE)
The product is an Android app built with Tauri 2. There is no web deliverable. The browser (`ng serve`) exists only for fast iteration with a mobile viewport (~390×844). Every feature is designed for touch (targets ≥ 44 px, safe-areas, virtual keyboard, no hover-only interactions) and is not done until verified on Android.

### II. Spec-Driven Development
Any change touching 2+ files starts with an approved spec in `specs/NNN-name/`. No implementation before explicit user approval of the spec. The cycle is spec → clarify → (Stitch design if there is a frontend) → plan → tasks → implement → PR review, driven by the `.claude/commands`. A cross-review by a second model (DeepSeek) runs after the clarify and before every push unless the spec declares a simple cycle. Specs list user stories with priorities (P1/P2/P3), acceptance criteria, a test plan, affected files, technical constraints and out-of-scope.

### III. Test-First / TDD (NON-NEGOTIABLE)
Red → Green → Refactor, per user story in priority order. No production code without a failing test written first (config, styles and scaffolding excepted). Every acceptance criterion maps to at least one test whose name references the story id (e.g. `US-003-01`). Bugs are fixed by first writing the test that reproduces them. Tests are MANDATORY in every plan and task list; they are never optional.

### IV. Three-Service Pattern
Each feature sub-component has a component (orchestrates UI, zero data access), a `*.constructor.service.ts` (static config) and a `*.access.service.ts` (the only point of contact with data, HTTP or native/Tauri APIs). Native APIs degrade gracefully in the browser.

### V. Modern Angular, No Material
Standalone components, Signals, `OnPush`, lazy-loaded routes, zoneless. No `any`. No `@angular/material`; UI is built with own components and CSS variables in `shared/components`.

### VI. Simplicity
Start simple (YAGNI). No dependencies, plugins, abstractions or error handling for impossible scenarios. Validate only at system boundaries.

### VII. No Secrets in a Public Repo (NON-NEGOTIABLE)
The repository is public. Passwords, access tokens, service-role/secret keys, private URLs, project refs, personal data (including personal emails), absolute local paths of the user's machine and private project names must never appear in versioned files, commits, PRs, logs or chat. Secrets live in git-ignored files; `pnpm secrets:check` (which also flags local paths and personal emails) runs on every commit, and every commit and push requires a manual audit of the diff and of the outgoing history. Database changes happen only through versioned migrations so anyone can recreate the schema in their own project.

## Workflow Constraints

- pnpm only; never npm or yarn.
- Before proposing a commit: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci` must pass.
- Never commit, push or open a PR without explicit user confirmation. Approving a plan or spec does not authorize them.
- Every user turn and every question Claude asks is recorded in `docs/interacciones.md`, classified `F` (functional) or `W` (workflow). Prefer a reasonable default over asking.

## Governance

This constitution supersedes other practices. Amendments require user approval and a version bump. Specs, plans and PRs must verify compliance; any deviation must be justified in the spec. Runtime guidance lives in `CLAUDE.md`.

**Version**: 1.1.0 | **Ratified**: 2026-11-13 | **Last Amended**: 2026-11-13
