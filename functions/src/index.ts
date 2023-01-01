import { FirebaseError } from 'firebase-admin/app';
import { config, firestore, https, logger } from 'firebase-functions';

import admin = require('firebase-admin');
admin.initializeApp(config().firebase);
const db = admin.firestore();

const baseURL = 'https://visible-thoughts-writer.web.app';

enum Role {
  Player = 'player',
  DM = 'dm',
  Admin = 'admin',
}

enum RoleToNotify {
  Player = 'player',
  DM = 'dm',
}

function getRoleToNotify(
  step: Record<string, unknown>
): RoleToNotify | undefined {
  if (!Object.prototype.hasOwnProperty.call(step, 'initT')) return undefined;
  if (!Object.prototype.hasOwnProperty.call(step, 'ppt')) return undefined;
  if (!Object.prototype.hasOwnProperty.call(step, 'ppptT')) return undefined;
  if (!Object.prototype.hasOwnProperty.call(step, 'act'))
    return RoleToNotify.Player;
  if (!Object.prototype.hasOwnProperty.call(step, 'pactT'))
    return RoleToNotify.DM;
  return undefined;
}

exports.notifyUpdateByEmail = firestore
  .document('runs/{runId}/steps/{stepId}')
  .onWrite(async (change, context) => {
    // console.log('change: ', change);
    // console.log('context: ', context);

    const after: FirebaseFirestore.DocumentData | undefined =
      change.after.data();
    if (after === undefined) return null;

    const roleToNotify = getRoleToNotify(Object.assign({}, after));
    logger.info('roleToNotify: ', roleToNotify);
    if (roleToNotify === undefined) return null;

    // Some notification might have to be sent!

    // Get the corresponding run document
    const runId = context.params.runId as string;
    logger.info('Retrieve runs doc with id ', runId);
    const runDocRef = db.doc(`runs/${runId}`);
    const run = await runDocRef.get();
    if (!run.exists) {
      logger.error(`Run ${runId} doesn't exist!`);
      return null;
    }
    const { players, dm } = run?.data() as { players: string[]; dm: string };
    logger.info('dm: ', JSON.stringify(dm));
    logger.info('players: ', JSON.stringify(players));

    // Get user ids of users to notify
    let uids = [];
    if (roleToNotify === RoleToNotify.Player) {
      logger.info('Getting players uids');
      uids = players;
    } else {
      logger.info('Getting DM uid');
      uids = [dm];
    }

    if (uids.length === 0) {
      logger.info('uids is empty');
      return null;
    }

    // Check whether the user has already been notified or not
    const n: number = parseInt(context.params.stepId as string);
    const uidsToNotify = [];
    for (const uid of uids) {
      const path = `users/${uid}/runs/${runId}`;
      logger.info(`Getting user run state doc ${path}`);
      const userRunStateDocRef = db.doc(path);
      const userRunState = await userRunStateDocRef.get();
      if (userRunState.exists) {
        const { roles, lastStepNotified } = userRunState?.data() as {
          roles: Set<Role> | undefined;
          lastStepNotified: number | undefined;
        };
        if (
          roles !== undefined &&
          !(roles.has(Role.DM) && roles.has(Role.Player)) &&
          !roles.has(roleToNotify.valueOf() as Role)
        ) {
          logger.warn(
            `Inconsistency between roles (${roles}) and roleToNotify(${roleToNotify})`
          );
        }
        // If they have not already been notified of the current step
        if (lastStepNotified !== undefined && lastStepNotified < n) {
          const userDocRef = db.doc(`users/${uid}`);
          const user = await userDocRef.get();
          if (user.exists) {
            const { emailNotif } = user?.data() as {
              emailNotif: boolean | undefined;
            };
            // Did the user ask for email notifications?
            if (emailNotif === true) {
              uidsToNotify.push(uid);
            }
          } else {
            logger.error(`User profile document not found for ${uid}!`);
          }
        }
      } else {
        logger.error(`Document ${path} does not exist`);
      }
    }
    logger.info('uidsToNotify: ', JSON.stringify(uidsToNotify));

    // Update the user run state to indicate that they have been notified
    const batch = db.batch();
    for (const uid of uidsToNotify) {
      batch.set(
        db.doc(`users/${uid}/runs/${runId}`),
        { lastStepNotified: n },
        { merge: true }
      );
    }
    const results = await batch.commit();
    logger.info('results: ', JSON.stringify(results));

    // Collect the email addresses for those uids
    const emails = await Promise.all(
      uidsToNotify.map(async (uid) => await admin.auth().getUser(uid))
    ).then((userRecords) =>
      userRecords.flatMap((userRecord) =>
        userRecord.email !== undefined ? [userRecord.email] : []
      )
    );
    logger.info('emails: ', emails);

    await Promise.all(
      emails.map(
        async (email) =>
          await db.collection('mail').add({
            to: email,
            message: {
              subject: '[Visible Thoughts Writer] Ready to continue your run!',
              html: `<a href="${baseURL}/runs/${runId}">Click here</a> to continue the adventure, ${roleToNotify}!`,
            },
          })
      )
    );

    return null;
  });

// When an invitation is created by a DM, send an email to the invited player
// with a link to an invitation page
exports.processInvite = firestore
  .document('runs/{runId}/invites/{inviteId}')
  .onCreate(async (snapshot, context) => {
    const inviteData: FirebaseFirestore.DocumentData | undefined =
      snapshot.data();
    if (inviteData === undefined) return null;

    // Get the corresponding run document
    const runId = context.params.runId as string;
    logger.info('Retrieve runs doc with id ', runId);
    const runDocRef = db.doc(`runs/${runId}`);
    const run = await runDocRef.get();
    if (!run.exists) {
      logger.error(`Run ${runId} doesn't exist!`);
      return null;
    }
    const { title, dm } = run?.data() as { title: string; dm: string };
    logger.info('title: ', title);
    logger.info('dm: ', dm);

    // Send the invitation via email
    const { email } = inviteData as { email: string };
    const inviteId = snapshot.id;
    const token = runId + '-' + inviteId;
    logger.info('token: ', token);
    await db.collection('mail').add({
      to: email,
      message: {
        subject: '[Visible Thoughts Writer] Invitation to play!',
        html:
          `<p>You have been invited to play a run named "${title}".</p></br>` +
          `<p>Ready? Click <a href="${baseURL}/invite?token=${token}">HERE</a> to accept the invitation!</p>`,
      },
    });

    return null;
  });

exports.confirmInvite = https.onCall(async (data, context) => {
  if (context === undefined) {
    throw new https.HttpsError(
      'failed-precondition',
      'The function must be called with a context.'
    );
  }
  if (context.auth === undefined) {
    throw new https.HttpsError(
      'failed-precondition',
      'The function must be called while authenticated.'
    );
  }

  const uid = context.auth.uid; // Authenticated user that accepted the invite

  const token: string | undefined = data; // Message text should contain the token for the invite
  if (token === undefined) {
    throw new https.HttpsError(
      'failed-precondition',
      'Token must be provided!'
    );
  }
  logger.info('token: ', token);
  const [runId, inviteId] = token.split('-');
  if (inviteId === undefined) {
    throw new https.HttpsError('failed-precondition', 'Invalid token!');
  }
  logger.info(`Got invite ${inviteId} for run ${runId}`);

  // Check that the token is valid
  const inviteDocRef = db.doc(`runs/${runId}/invites/${inviteId}`);
  const inviteDoc = await inviteDocRef.get();
  if (!inviteDoc.exists) {
    throw new https.HttpsError(
      'not-found',
      `Invite does not exist or was already used! Ask the DM to send you a new one.`
    );
  }

  // Check if the user has already a role in the run
  const userRunStateDocRef = db.doc(`users/${uid}/runs/${runId}`);
  const userRunStateDoc = await userRunStateDocRef.get();
  let newRoles = new Set();
  if (userRunStateDoc.exists) {
    const { roles } = userRunStateDoc?.data() as {
      roles: Set<Role> | undefined;
    };
    if (roles !== undefined) newRoles = roles;
  }
  // Invited users are granted the Player role
  newRoles.add(Role.Player);

  const batch = db.batch();
  // Add the player to the list of players for the run
  batch.update(db.doc(`runs/${runId}`), {
    players: admin.firestore.FieldValue.arrayUnion(uid),
  });
  // Set the user run state
  batch.set(userRunStateDocRef, {
    lastStepNotified: 0,
    roles: newRoles,
  });
  // Delete the invite
  batch.delete(inviteDocRef);
  const results = await batch.commit().catch((err: FirebaseError) => {
    throw new https.HttpsError(
      'internal',
      `Oops, something went wrong internally: ${err.message}`
    );
  });
  logger.info('results: ', JSON.stringify(results));

  return null;
});

exports.deleteRun = https.onCall(async (data, context) => {
  // Check that the caller is authenticated
  const uid = context.auth?.uid;
  if (uid === undefined) {
    throw new https.HttpsError(
      'failed-precondition',
      'The function must be called while authenticated.'
    );
  }

  // Check that provided runId is valid
  const runId = data as string;
  const runDocRef = db.doc(`runs/${runId}`);
  const run = await runDocRef.get();
  if (!run.exists) {
    throw new https.HttpsError('not-found', `Run ${runId} does not exist!`);
  }

  // Check that the caller is the run's DM
  const { dm, players } = run?.data() as { dm: string; players: string[] };
  if (dm !== uid) {
    throw new https.HttpsError(
      'permission-denied',
      `Only the DM can delete the run!`
    );
  }

  // Mark the run document as deleted
  await runDocRef.update({ deleted: true }).catch((err: FirebaseError) => {
    throw new https.HttpsError(
      'internal',
      `Oops, something went wrong internally: ${err.message}`
    );
  });

  // Delete user run states from this run
  const batch = db.batch();
  const userIds = [dm, ...players];
  userIds.forEach((userId) => {
    const userRunStateDocRef = db.doc(`users/${userId}/runs/${runId}`);
    if (userRunStateDocRef !== undefined) batch.delete(userRunStateDocRef);
  });
  await batch.commit().catch((err: FirebaseError) => {
    throw new https.HttpsError(
      'internal',
      `Oops, something went wrong internally: ${err.message}`
    );
  });

  return null;
});

// Function transformStepForIndexing
// Used by the Firestore Algolia Search extension to transform a step document
// before indexing it in Algolia.

function withoutUndefinedValues(
  obj: Record<string, unknown>
): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) =>
      value !== undefined ? { ...acc, [key]: value } : acc,
    {}
  );
}

const flattenThoughtSection = (
  bullets: Array<{ T: Array<{ txt: string }> }> | null | undefined
): string[] | undefined => {
  if (bullets === undefined || bullets === null) return undefined;
  const flattened = bullets.flatMap((bullet) =>
    bullet.T.flatMap((t) => (t.txt !== '' ? [t.txt] : []))
  );
  return flattened.length > 0 ? flattened : undefined;
};

export const transformedStep = (payload: any): any => {
  // path looks like this: "runs/IuqDbf8iNJw6aM2DqVuB/steps/2"
  const runId: string = payload.path.split('/')[1];
  const n: number = payload.n;

  return withoutUndefinedValues({
    objectID: `${runId}/${n}`,
    runId,
    n,
    initT: flattenThoughtSection(payload.initT),
    ppt: payload.ppt,
    ppptT: flattenThoughtSection(payload.ppptT),
    act: payload.act?.txt,
    pactT: flattenThoughtSection(payload.pactT),
    out: payload.out?.txt,
  });
};

export const transformStepForIndexing = https.onCall((payload) => {
  const transformedData = transformedStep(payload);
  logger.info('transformedData: ', JSON.stringify(transformedData));
  return transformedData;
});
