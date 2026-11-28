# Firebase setup — Web Portfolio

The portfolio now targets the Firebase project `web-portfolio-b50dd` and its `(default)` Cloud Firestore database in `africa-south1` (Johannesburg). This is a fresh project: no data is imported from the previous Firebase project.

## 1. Enable Firebase Authentication

In the Firebase console for **Web Portfolio**:

1. Open **Authentication → Sign-in method** and enable **Google**.
2. Add `localhost` and the production hosting domain under **Authentication → Settings → Authorized domains**.
3. No Identity Platform upgrade or TOTP configuration is required for this administrator flow.

The Admin Console is restricted to the verified Google account `jaccie.wambui26@gmail.com`. Other Google accounts are signed out and cannot access administrator features.

## 2. Deploy Firestore rules

The repository's `.firebaserc` selects `web-portfolio-b50dd`, and `firebase.json` points the Firebase CLI at `firestore.rules`.

From the repository root, with Firebase CLI available:

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

Review the deployment target before confirming. The rules allow public reads only for designated public portfolio data, validated public contact/analytics submissions, and admin operations only for the verified allowlisted administrator account.

## 3. Verify the web app

The checked-in `firebase-applet-config.json` contains the web app configuration for `web-portfolio-b50dd`. The client initializes Firestore with `getFirestore(app)`, which selects the `(default)` database.

Run:

```powershell
npm install
npm run lint
npm run build
```

Then test the public portfolio, Google sign-in with the allowlisted administrator account, sign-out, and rejection of other Google accounts.

## Important

- Never commit Firebase service-account private keys, OAuth client secrets, or other server credentials.
- Firebase web config values are public app identifiers; Firestore rules and Authentication controls enforce access.
- TOTP cannot be activated by repository code alone. It must be enabled for the Firebase project in the Identity Platform console before enrollment can work.
