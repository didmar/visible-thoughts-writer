# Visible Thoughts Writer

## Setup

### Firebase project

Create a project on [Firebase](https://console.firebase.google.com) and enable the following modules: Authentication, Firestore, Hosting and Functions.

For sending notification emails, the application needs an SMTP relay service such as SendGrid:

- [Create a free account on SendGrid](https://signup.sendgrid.com/)
- [Create an API key for SMTP relay](https://app.sendgrid.com/guide/integrate/langs/smtp)
- Install the [Trigger Email extension](https://extensions.dev/extensions/firebase/firestore-send-email) in your Firebase project and configure it with the SendGrid API key.
- Rename `extensions/firestore-send-email.env.template` into `extensions/firestore-send-email.env.template` and edit it to change `<your_name>`, `<your_email_address>` and `<your_api_key>` with your SendGrid API key.

For search capabilities, the application uses Algolia:

- [Create a free account on Algolia](https://www.algolia.com/users/sign_up).
- Create an application and an index named `prod_steps`
- Import the configuration of that index from the file `algolia-prod_steps-conf.json`
- Install the [Firestore Algolia Search extension](https://extensions.dev/extensions/algolia/firestore-algolia-search) in your Firebase project and configure it with the following settings:
  - `COLLECTION_PATH`: `runs/{parentId}/steps`
  - `ALGOLIA_APP_ID`: your Algolia app ID
  - `ALGOLIA_API_KEY`: your Algolia API key created specifically for indexing (see [this](https://github.com/algolia/firestore-algolia-search#configuration-parameters))
  - `ALGOLIA_INDEX_NAME`: `prod_steps`
  - `TRANSFORM_FUNCTION`: `transformStepForIndexing`
- Rename `extensions/firestore-algolia-search.env.template` into `extensions/firestore-algolia-search.env` and fill in the info like above.

### Local setup

Rename `src/firebase.creds.json.temp` into `src/firebase.creds.json` and edit it with the credential from the Firebase project.

Rename `src/conf.json.temp` into `src/conf.json` and fill in the required info.

Connect to your Firebase project:

```bash
npm install -g firebase-tools
firebase login
```

Install project dependencies:

```bash
npm install
```

### Using emulators (optional)

To make some local tests without interacting with the production environment,
you can run emulators for all the Firebase services (except Hosting).

Optional: to have Cloud functions working, you need to set up the `GOOGLE_APPLICATION_CREDENTIALS` environment variable, see [here](https://firebase.google.com/docs/functions/local-emulator#set_up_admin_credentials_optional). Otherwise, it will call the production environment.

Run the following command to start the emulators:

```bash
firebase emulators:start
```

Edit `src/conf.json` to set `useEmulators` to `true`, for the React app to use them.

Copy

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
