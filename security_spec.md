# Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. Only the verified administrator (`request.auth.token.email_verified == true` and email matching `jaccie.wambui26@gmail.com` or registered in `/admins/{uid}`) may write public portfolio content (`/portfolio_public/*`, `/projects/*`, `/skills/*`, `/experiences/*`, `/education/*`).
2. Public visitors can never read draft/unpublished projects, flagged/unpublished experiences, private CV versions (`/cv_versions/*`), pending approvals (`/pending_approvals/*`), audit logs (`/audit_logs/*`), GitHub settings (`/github_settings/*`), contact messages (`/contact_messages/*`), or analytics events (`/analytics_events/*`).
3. Every `allow list` on collections with mixed public/private visibility (`projects`, `skills`, `experiences`, `education`) enforces `resource.data.isPublic == true || isAdmin()` so unauthenticated queries without `where('isPublic', '==', true)` fail at the rules layer.
4. Public contact form submissions (`/contact_messages/{id}`) may only be created with `status == 'unread'` and `createdAt == request.time`, and may never be read, updated, or deleted by non-admins.
5. Audit logs (`/audit_logs/{id}`) are append-only by admins (`update` and `delete` are permanently denied).
6. All document IDs are validated with `isValidId(id)` (`^[a-zA-Z0-9_-]+$`, `<= 128` chars), and every string and array enforces explicit length caps.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Admin Email Spoof**: `{ auth: { uid: "attacker", token: { email: "jaccie.wambui26@gmail.com", email_verified: false } } }` writing to `/projects/hack` -> `PERMISSION_DENIED`.
2. **Self-Assigned Admin Escalation**: Authenticated non-admin creating `/admins/attackerUid` with `{ email: "attacker@example.com", role: "admin" }` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Contact Message**: Public visitor creating `/contact_messages/msg1` with extra field `isAdminNote: true` -> `PERMISSION_DENIED`.
4. **Pre-Approved Status Injection on Contact Message**: Public visitor creating `/contact_messages/msg2` with `status: "replied"` -> `PERMISSION_DENIED`.
5. **Unbounded String Poisoning (DoW)**: Public visitor creating `/contact_messages/msg3` with `message` of 10,000 characters -> `PERMISSION_DENIED`.
6. **Blanket List Scraping of Draft Projects**: Unauthenticated user listing `/projects` without filtering `isPublic == true` -> `PERMISSION_DENIED`.
7. **Draft Experience Leakage**: Unauthenticated user fetching `/experiences/cal-westlands` where `isPublic == false` -> `PERMISSION_DENIED`.
8. **Private CV Version Exfiltration**: Unauthenticated or non-admin user reading `/cv_versions/v1` -> `PERMISSION_DENIED`.
9. **Approval Queue Tampering**: Non-admin user reading or updating `/pending_approvals/req1` -> `PERMISSION_DENIED`.
10. **Audit Log Deletion / Backdating**: Admin attempting to delete `/audit_logs/log1` or create a log with client-forged `createdAt` -> `PERMISSION_DENIED`.
11. **Path ID Poisoning**: Creating `/projects/invalid$id..slash` -> `PERMISSION_DENIED`.
12. **Terminal State Replay on Pending Approval**: Updating an already `'approved'` `/pending_approvals/req1` without an admin override or setting an invalid enum `status: 'published_bypass'` -> `PERMISSION_DENIED`.
