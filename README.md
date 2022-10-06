# Visible Thoughts Writer

## Setup

### Initial setup

Create a project on Firebase with Firestore and Hosting.

Rename `src/firebase.creds.json.temp` into `src/firebase.creds.json` and edit it with the credential from the Firebase project.

Rename `src/conf.json.temp` into `src/conf.json` and edit it with the link to the help & feedback document.

Rename `extensions/firestore-send-email.env.template` into `extensions/firestore-send-email.env.template` and edit it to change `yourname` and `provider.com`.

Connect to your Firebase project:

```bash
npm install -g firebase-tools
firebase login
```

### Using emulators (optional)

To make some local tests without interacting with the production environement,
you can run emulators for all the Firebase services (except Hosting):

```bash
firebase emulators:start
```

Then see below to run the React app.

### Run development version locally

`npm run start` to run the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

To populate the database with random data:

```bash
npx tsx scripts/populate.ts
```

For unit testing, run `npm run test`.

### Run production build locally

```bash
npm install -g serve
npm run build && serve -s build
```

### Deploy to hosting service

```bash
npm run build && firebase deploy
```
