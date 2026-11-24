# Jacinta Wambui Waweru — Full-Stack Developer Portfolio

A full-stack professional portfolio for **Jacinta Wambui Waweru** (`Lex-Cable`) built with React, TypeScript, Tailwind CSS, Express, Firebase Authentication, Cloud Firestore, GitHub REST/GraphQL synchronization, and server-side Gemini AI assistance.

## Architecture & Project Structure

- `server.ts` — Express server (port 3000) serving Vite/SPA, Firebase ID token verification (`firebase-admin/auth`), rate-limited APIs, configurable GitHub background scheduler, `/sitemap.xml`, and `/robots.txt`.
- `server/githubService.ts` — GitHub REST & GraphQL API client with retry/backoff, README hashing, and dependency manifest inspection (`package.json`, `composer.json`).
- `server/geminiService.ts` — Server-side `@google/genai` (`gemini-4-hydrogen`) integration for grounded repository analysis and portfolio content advisories.
- `server/emailService.ts` — Optional `nodemailer` SMTP forwarding and sender acknowledgement.
- `src/services/portfolioDb.ts` — Real-time Cloud Firestore subscriptions, initial data seeding, approval workflow persistence, CV versioning, and audit logging.
- `src/components/` — Modular public views (`HomeSection`, `AboutSection`, `SkillsSection`, `ProjectsSection`, `GithubActivitySection`, `ExperienceSection`, `ContactSection`) and private `AdminDashboard`.
- `firestore.rules` & `firebase-blueprint.json` — Hardened Attribute-Based Access Control rules and intermediate schema definition.

## Database Schema (Cloud Firestore)

- `portfolio_public/profile`, `portfolio_public/github_cache`, `portfolio_public/approved_cv` — Publicly readable singletons.
- `projects`, `skills`, `experiences`, `education` — Mixed-visibility records enforcing `resource.data.isPublic == true || isAdmin()` on reads and queries.
- `pending_approvals`, `audit_logs`, `cv_versions`, `github_settings`, `admins` — Strictly admin-only collections.
- `contact_messages`, `analytics_events` — Publicly creatable (with strict schema/size checks), admin-only readable.

## API Endpoints

- `GET /api/health` — Server and integration readiness status.
- `GET /api/github/snapshot` — Public cached/live GitHub REST & GraphQL snapshot for `Lex-Cable`.
- `POST /api/github/sync` *(Admin Bearer token required)* — Live GitHub sync + new repo / README change detection + optional Gemini summaries.
- `POST /api/ai/analyze-repo` *(Admin Bearer token required)* — Grounded repository summary & stack verification.
- `POST /api/ai/advisory` *(Admin Bearer token required)* — Grounded bio polish, SEO metadata, CV suggestions, or missing-info audit.
- `POST /api/contact` — Rate-limited, honeypot-protected contact form submission and optional SMTP dispatch.
- `GET /api/automation/status`, `POST /api/automation/config` *(Admin Bearer token required)* — Scheduler controls and logs.
- `POST /api/cron/github-sync` *(Protected by `x-cron-secret` header)* — External cron webhook for Cloud Scheduler or GitHub Actions.
- `GET /sitemap.xml`, `GET /robots.txt` — SEO discoverability endpoints.

## Environment Variables (`.env.example`)

- `GEMINI_API_KEY` — Server-side Gemini API key (configured via Secrets panel).
- `APP_URL` — Public deployment URL.
- `GITHUB_USERNAME` — Defaults to `Lex-Cable`.
- `GITHUB_TOKEN` — Optional read-only PAT (`public_repo`, `read:user`) enabling GitHub GraphQL contribution stats and 5,000 req/hr limits.
- `ADMIN_EMAIL` — Defaults to `jaccie.wambui26@gmail.com`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — Optional SMTP credentials for email forwarding.
- `CRON_SECRET` — Shared secret for external scheduled sync triggers.

## Setup, Testing & Deployment

1. **Install dependencies**: `npm install`
2. **Development**: `npm run dev` (starts Express + Vite on port 3000)
3. **TypeScript check**: `npm run lint`
4. **Firestore security rules lint & test**: `npm run lint:rules` and `npx tsx --test firestore.rules.test.ts`
5. **Production build & start**: `npm run build` followed by `npm start`
6. **Scheduled External Sync**: Configure a GitHub Actions cron workflow or Google Cloud Scheduler job to `POST https://<your-domain>/api/cron/github-sync` with header `x-cron-secret: <CRON_SECRET>`.
