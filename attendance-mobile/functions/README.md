# Firebase Functions for Attendance App

This folder contains sample Cloud Functions to support session publishing and cleanup.

Files:
- `index.js` — onCreate trigger for `sessions` and a scheduled cleanup to clear expired `currentToken` fields from `lectures`.
- `package.json` — Node 18 runtime and dependencies.

Deploy steps:
1. Install Firebase CLI and login:

```bash
npm install -g firebase-tools
firebase login
```

2. Initialize functions (if not already):

```bash
cd functions
npm install
# If this is first time, run: firebase init functions --project your-firebase-project-id
```

3. Deploy functions:

```bash
firebase deploy --only functions
```

Notes:
- Ensure your Firebase project is selected (`firebase use <projectId>`).
- Grant the service account necessary Firestore permissions if needed.
