/**
 * Firestore Security Rules Test Suite (Phase 0 TDD Verification)
 * Run with Firebase Emulator Suite:
 *   npx firebase emulators:exec --only firestore "npx tsx --test firestore.rules.test.ts"
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Production firestore.rules enforces global default deny and Eight Pillars helpers', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /rules_version\s*=\s*'2'/);
  assert.match(rules, /match \/{document=\*\*}\s*\{\s*allow read, write: if false;/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /isValidId\(/);
  assert.match(rules, /isValidProject\(/);
  assert.match(rules, /isValidPendingApproval\(/);
  assert.match(rules, /isValidContactMessage\(/);
  assert.match(rules, /allow update: if false;\s*allow delete: if false;/);
});
