# Visible Thoughts Writer

## Setup

Create a project on Firebase with Firestore and Hosting.

Rename `src/firebase.creds.json.temp` in `src/firebase.creds.json` and edit it with the credential from the Firebase project.

Rename `src/conf.json.temp` in `src/conf.json` and edit it with the link to the help & feedback document.

`npm run start` to run the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

To populate the database with random data:

```bash
npx tsx scripts/populate.ts
```

To build and deploy:

```bash
firebase login
npm run build
firebase deploy
```
