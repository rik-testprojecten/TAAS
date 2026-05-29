# TAAS — Multi-Disciplinary Engineering Review

> Scope: full-system audit of the TAAS codebase as of branch
> `claude/engineering-review-framework-xGNhV`. Reviewed simultaneously as Senior
> Engineer, Security Officer, Privacy Officer, DevOps/Platform Engineer, UX/UI
> Expert, Product Engineer, AI/Automation Specialist, and Compliance & Risk
> Officer. Findings are grounded in concrete `file:line` references. A subset of
> the security/privacy findings is **implemented in this same PR** — see
> [§7 Addressed in this PR](#7-addressed-in-this-pr).

---

## 1. System analysis

**Purpose.** TAAS ("Rhoost Test & Automation Assessment Software") is a
multi-tenant SaaS for running enterprise ERP-implementation test programs. The
domain hierarchy is `Project → TestPhase (FAT/GAT/PAT) → Flow → FlowVersion →
FlowStep`, executed via `TestRun → RunStep`, with `Issue`/`Task` workflows,
`AuditLog`, `GoLiveCriteria`, and PDF reporting. UI and labels are Dutch.

**Stack.** Next.js 15.3.9 (App Router) · React 19 · TypeScript 5.7 (strict) ·
Prisma 5.22 · PostgreSQL (Neon) · NextAuth v5 (**beta**) · Tailwind 3.4 ·
`@react-pdf/renderer` · `@vercel/blob` · Pino · Nodemailer · Zod. Deployed on
Vercel (`vercel.json`).

**Architecture.** Two tiers — *platform* (`PlatformUser`: SUPER_ADMIN/ADMIN) and
*tenant* (`TenantUser`: TENANT_ADMIN/SCRIPT_WRITER/TESTER/FUNCTIONAL_MANAGER).
Route groups `(auth)`, `(platform)`, `(tenant)`; 49 API route handlers; shared
helpers in `src/lib` (`api-helpers.ts`, `prisma.ts`, `audit.ts`, `mailer.ts`,
`pdf.ts`, `rate-limit.ts`, `logger.ts`). ~16k LOC across ~101 TS/TSX files; 25+
Prisma models in `prisma/schema.prisma`.

**Cohesion — strengths.** Clean platform/tenant separation; centralized auth
helpers (`requireTenantAuth`/`requirePlatformAuth`); consistent Zod validation at
input boundaries; Prisma everywhere (no raw SQL); tenant isolation via `tenantId`
scoping; structured Pino logging; an audit-log mechanism.

**Key assumptions, risks & missing components.**
- **No automated tests** and **no CI/CD** — refactors and dependency bumps are
  unguarded. (`package.json` has no test deps; no `.github/workflows`.)
- **Schema managed with `prisma db push`**, not versioned `prisma migrate`; no
  `prisma/migrations/` directory → no reproducible schema history.
- **No health/readiness/metrics endpoints** → limited operational visibility.
- **NextAuth v5 is a beta** dependency in a would-be production app.
- API authorization is **per-route by convention**: `middleware.ts:26` excludes
  `/api`, so every handler must remember to call an auth helper. One omission =
  an open endpoint.

---

## 2. Multi-role findings

Severity: 🔴 critical · 🟡 high · 🟢 medium/low.

### 2.1 Senior Software Engineer
- 🟡 **God-pages.** `src/lib/pdf.ts` (~2.5k LOC) and client pages such as
  `src/app/(tenant)/projects/[id]/phases/[phaseId]/page.tsx` (~1,070 LOC, ~48
  `useState` calls), `flows/[id]/page.tsx` (~831 LOC) mix data-fetching, state,
  modals and business logic with no hook extraction.
- 🟡 **Silent error handling.** Empty `.catch(() => {})` swallow failures (e.g.
  `phases/[phaseId]/page.tsx`), and only ~10 try/catch blocks across 49 API
  routes. Client fetch failures often produce no user feedback.
- 🟢 **Type-safety erosion.** ~88 `any`/`as any` usages despite `strict: true`
  (e.g. `issues/[id]/page.tsx`, `flows/[id]/page.tsx`).
- 🟢 **Duplication.** Repeated form/modal/confirmation patterns and inline
  status-color maps (some already centralized in `src/lib/utils.ts`).
- 🔴 **Zero tests.** No unit/integration/E2E coverage anywhere.

### 2.2 Security Officer (OWASP-oriented)
- 🔴 **Attachment data exposure (Broken Access Control / IDOR).**
  `src/app/api/attachments/route.ts` uploaded to Vercel Blob with
  `access: "public"` and the authenticated `GET` simply `redirect`ed to that
  public URL — any holder of the URL could read it regardless of tenant. No MIME
  allowlist; `Content-Disposition` interpolated `fileName` unsanitized
  (header-injection / content-sniffing risk).
- 🔴 **Hardcoded seed credentials.** `prisma/seed.ts` hashed fixed passwords
  (`Admin123!`, …) and **printed them to stdout**.
- 🟡 **Plaintext password in invite email.** `src/lib/mailer.ts:52` emailed the
  account password in clear text.
- 🟡 **Missing security headers.** `next.config.ts` set none (no CSP,
  X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy).
- 🟡 **No password change/reset.** `users/[id]` PATCH handled only
  roles/isActive/name; users could never rotate their own password.
- 🟡 **Rate limiting login-only and in-memory.** `src/lib/rate-limit.ts` guarded
  only `/api/auth` sign-in and uses a per-instance `Map` (ineffective across
  Vercel lambdas).
- 🟢 **Session cookie defaults implicit.** `auth.ts` relied on NextAuth defaults;
  no explicit `maxAge`, `sameSite`, `secure`, `httpOnly`.
- 🟢 **Beta auth dependency** (NextAuth v5 beta).
- ✅ Good: bcrypt (rounds 10), Prisma (no SQLi), Zod validation, tenant scoping,
  no SSRF/command-exec, no third-party trackers.

### 2.3 Privacy Officer (GDPR/AVG)
- 🔴 **No right-to-erasure.** Users could only be soft-deactivated
  (`isActive:false`); no deletion/anonymization path. PII (name, email) retained
  indefinitely.
- 🔴 **No data export (Art. 15/20).** No machine-readable subject-data export.
- 🟡 **Audit logs may persist PII unredacted.** `src/lib/audit.ts` stored raw
  `before/after` JSON (could include emails, names, free text) with no redaction
  and indefinite retention.
- 🟡 **No privacy notice / consent surface** referenced anywhere.
- 🟢 **Data minimization** otherwise reasonable; only first-party auth cookie,
  no analytics. External processors (Neon, Vercel Blob, SMTP) are
  operator-configured.

### 2.4 DevOps / Platform Engineer
- 🟡 **No CI/CD** (no lint/type-check/test gate before deploy).
- 🟡 **`prisma db push`** instead of versioned migrations → risky schema drift,
  no rollback story.
- 🟡 **No health/metrics endpoints**, no error tracking (Sentry), no tracing.
- 🟢 **In-memory rate limit** won't hold across serverless instances (needs
  Upstash/Redis).
- 🟢 **No documented backup/RTO/RPO** (delegated to Neon).
- ✅ Good: declarative Vercel build, Pino structured logs, env-based config, no
  secrets committed (`.gitignore` covers `.env`).

### 2.5 UX/UI Expert (WCAG)
- 🟡 **Weak accessibility.** Sparse ARIA (~9 usages), non-semantic `<div>`
  layouts, form inputs without `<label htmlFor>`, lists rendered as grids rather
  than `<table>`, few `alt` texts, no modal focus traps.
- 🟢 **No inline form validation** — errors surface only via toast after submit;
  required-field gating disables buttons without explaining why.
- ✅ Good: responsive breakpoints, mobile sidebar collapse, focus-visible rings,
  Escape-to-close on the search modal.

### 2.6 Product Engineer
- 🟢 **Cognitive overload on god-pages** (phase/flow editors do too much at once)
  — candidates for progressive disclosure.
- 🟢 **Invite UX coupling**: admin-chosen password + emailed secret conflates
  provisioning with credential handoff (addressed via set-password flow below).
- ✅ Strong domain focus; the FAT/GAT/PAT → finding → go/no-go pipeline maps
  cleanly to the real testing process.

### 2.7 AI/Automation Specialist
- 🟢 **Manual, repetitive flows** ripe for assist: CSV import exists
  (`/api/import/flows`) but no template-suggestion or auto-step-generation; PDF
  assembly is hand-rolled. Opportunity (future): summarize issue clusters,
  suggest go/no-go from `GoLiveCriteria`. Not security-relevant; noted only.

### 2.8 Compliance & Risk Officer
- 🟡 **Audit completeness.** `logAudit` exists but is called from only a few
  routes (issues, run-steps). Mutations elsewhere (users, projects, settings)
  are not consistently audited → incomplete traceability.
- 🔴 **No retention policy** for audit logs or PII (governance gap).
- 🟢 **No DPA/privacy documentation** in-repo.

---

## 3. UX optimization (recommendations only)

Written recommendations per the agreed scope; no UI code changes in this PR
beyond the new accessible `set-password` page.

1. **Progressive disclosure on god-pages.** Split the phase editor into tabs/
   sections (Flows · Monitor · Settings) and lazy-mount each; extract state into
   hooks (`usePhaseEditor`, `useFlowEditor`) to cut re-render scope and LOC.
2. **Form accessibility & feedback.** Associate every input with `<label
   htmlFor>`; add `aria-invalid` + `aria-describedby` for inline errors; show
   field-level messages instead of disabled-button-only gating. (The new
   `set-password` page demonstrates the labeled-input pattern.)
3. **Semantic landmarks.** Use `<header>`/`<nav>`/`<main>`; render tabular lists
   (issues, tasks, audit) as `<table>` with `<th scope>` for screen-reader and
   keyboard support.
4. **Fast feedback loops.** Surface every fetch failure as a toast (replace empty
   `.catch(()=>{})`); add optimistic UI + skeleton/loading states on long lists.
5. **Modal correctness.** Add focus traps, restore focus on close, and `Esc`
   handling consistently across dialogs.
6. **Mobile-first lists.** Replace grid-as-table with responsive
   card/table-switch patterns; verify the 1000-LOC pages at small viewports.

---

## 4. Security & privacy hardening plan (prioritized)

| # | Item | Priority | Status |
|---|------|----------|--------|
| 1 | Security response headers (CSP/HSTS/XFO/nosniff/Referrer/Permissions) | P0 | ✅ implemented |
| 2 | Remove hardcoded/printed seed credentials | P0 | ✅ implemented |
| 3 | Explicit session/cookie hardening + 8h expiry | P0 | ✅ implemented |
| 4 | Attachment access control (stream-through) + MIME allowlist + filename sanitization | P0 | ✅ implemented |
| 5 | GDPR erasure (anonymize, protect last admin) | P0 | ✅ implemented |
| 6 | GDPR data export (Art. 15/20) | P1 | ✅ implemented |
| 7 | Reusable, bucketed rate limiting on sensitive routes | P1 | ✅ implemented |
| 8 | Self-service password change | P1 | ✅ implemented |
| 9 | Audit-log PII redaction/minimization | P1 | ✅ implemented |
| 10 | Token-based invite / set-password (no plaintext secret in email) | P1 | ✅ implemented |
| 11 | NextAuth v5 beta → stable upgrade | P0 | ⏸ deferred (no stable v5 yet; needs tests) |
| 12 | Distributed rate limiting (Upstash Redis) | P1 | ⏸ deferred (external infra) |
| 13 | Privacy notice + (cookie) consent surface | P1 | ⏸ deferred (operator/legal copy) |
| 14 | Consistent `logAudit` on all mutations + retention policy | P1 | ⏸ deferred (cross-cutting) |

**Safe-by-design / Zero-trust principles applied here.** Deny-by-default headers;
secrets never logged or emailed; access enforced at the data boundary (attachment
streaming) rather than by URL secrecy; short-lived signed tokens with
timing-safe verification; rate limits per logical bucket; least-privilege checks
(self-or-admin) on export.

---

## 5. System optimization & refactor plan

- **Testing & CI.** Add Vitest + `@testing-library` for utilities/API helpers,
  Playwright for the core test-execution flow; wire a GitHub Actions pipeline
  (`type-check → lint → test → build`) as a deploy gate.
- **Migrations.** Switch from `prisma db push` to versioned `prisma migrate` with
  a committed `prisma/migrations/` history and a `DIRECT_URL`.
- **Modularize `pdf.ts`.** Extract reusable PDF components (header, KPI block,
  section, table) and a small style module; target <300 LOC per file.
- **Page decomposition.** Pull data-fetching and state into hooks; co-locate
  feature components; eliminate `any` by typing API responses from
  `src/types/index.ts`.
- **Observability.** Add `/api/health` (DB ping) + `/api/metrics`, integrate
  error tracking, and emit `logAudit` on every mutating route.
- **Resilience.** Move rate limiting to a shared store (Upstash) and add idempotency
  where retries matter.

---

## 6. Final improved version (target state)

A TAAS that is **secure-by-default** (strict headers, hardened cookies, gated
attachments, signed invite links, bucketed rate limits), **privacy-compliant**
(erasure + export endpoints, redacted/retained-with-policy audit logs, a privacy
notice), **scalable & reliable** (versioned migrations, health/metrics, distributed
rate limiting, error tracking), **maintainable** (tests + CI, decomposed pages and
PDF, no `any`), and **user-friendly** (accessible labeled forms, progressive
disclosure, consistent feedback). This PR delivers the security/privacy core of
that target; §5 items remain as the follow-up roadmap.

---

## 7. Addressed in this PR

Implemented in the same change set as this document:

- **Security headers** — `next.config.ts` (`async headers()`: CSP, HSTS in prod,
  X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy,
  Permissions-Policy).
- **Session/cookie hardening** — `auth.ts` (`session.maxAge` 8h; explicit
  `httpOnly`/`sameSite=lax`/`secure`-in-prod session cookie).
- **Seed hardening** — `prisma/seed.ts` (env-var or random passwords via
  `crypto.randomBytes`; no plaintext printed; production seeding blocked unless
  `ALLOW_PROD_SEED=true`). New env vars documented in `.env.example`.
- **Attachment access control** — `src/app/api/attachments/route.ts` (authenticated
  stream-through instead of public-URL redirect; MIME allowlist; decoded-size
  check; `Content-Disposition` filename sanitization; `nosniff` + `no-store`).
- **GDPR erasure** — `DELETE /api/users/[id]` (anonymize + invalidate credentials;
  refuses to remove the last active admin; audited).
- **GDPR export** — `GET /api/users/[id]/export` (self-or-admin; JSON of subject
  data + contributions; rate-limited).
- **Reusable rate limiting** — `src/lib/rate-limit.ts` (`rateLimit({bucket,…})`;
  backward-compatible `checkRateLimit`) applied to user-create, export,
  password-change and set-password.
- **Password change** — `POST /api/account/password` (verifies current password;
  platform + tenant users; audited for tenant).
- **Audit PII minimization** — `src/lib/audit.ts` (`redact()` drops secrets, masks
  emails) applied inside `logAudit`.
- **Token-based invite / set-password** — `src/lib/invite-token.ts` (stateless,
  HMAC-signed, 7-day, timing-safe), `src/lib/mailer.ts` (link instead of
  password), public `set-password` page + `POST /api/account/set-password`,
  middleware allowlist.

### Verification performed
- `npx tsc --noEmit` — clean.
- `next build` — succeeds; all new routes compile
  (`/api/account/password`, `/api/account/set-password`, `/api/users/[id]/export`,
  `/set-password`).
- Lint: the repo ships **no** ESLint config (running `next lint` would
  interactively scaffold one), so lint was not run; type-check + build are the
  gates used.

### Honesty / limitations
- There is **no test suite**, so these changes are validated by type-check, build
  and manual review — **not** by passing tests. Adding tests + CI (see §5) is the
  most important follow-up.
- The attachment fix keeps the Vercel Blob object technically public but **routes
  all reads through the authenticated handler**; the enforcement boundary is the
  API route, not URL secrecy. Moving to private blob storage (or signed,
  short-lived URLs) is the stronger end state.
- Items #11–#14 in §4 are intentionally deferred (dependency stability, external
  infra, and operator-supplied legal/governance content).
