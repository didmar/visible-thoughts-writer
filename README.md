# Visible Thoughts Writer

## Setup

### Initial setup

Create a project on [Firebase](https://console.firebase.google.com) and enable Authentication, Firestore, Hosting and Functions.

For the application to send emails, [create a free account on SendGrid](https://signup.sendgrid.com/) and then [create an API key for SMTP relay](https://app.sendgrid.com/guide/integrate/langs/smtp) (or use another SMTP relay service).

Rename `src/firebase.creds.json.temp` into `src/firebase.creds.json` and edit it with the credential from the Firebase project.

Rename `src/conf.json.temp` into `src/conf.json` and edit it with the link to the help & feedback document.

Rename `extensions/firestore-send-email.env.template` into `extensions/firestore-send-email.env.template` and edit it to change `<your_name>`, `<your_email_address>` and `<your_api_key>` with your SendGrid API key

Connect to your Firebase project:

```bash
npm install -g firebase-tools
firebase login
```

### Using emulators (optional)

To make some local tests without interacting with the production environment,
you can run emulators for all the Firebase services (except Hosting).

Optional: to have Cloud functions working, you need to set up the `GOOGLE_APPLICATION_CREDENTIALS` environment variable, see [here](https://firebase.google.com/docs/functions/local-emulator#set_up_admin_credentials_optional).

Run the following command to start the emulators:

```bash
# Will use the export/ folder to persist data
firebase emulators:start --export-on-exit export --import export
```

and edit `src/conf.json` to set `useEmulators` to `true`, for the React app to use them.

Then, see below to run the React app either in development or production mode.

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
