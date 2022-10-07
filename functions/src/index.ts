import { firestore, logger, config } from 'firebase-functions';

import admin = require('firebase-admin');
admin.initializeApp(config().firebase);
const db = admin.firestore();

enum Role {
  Player = 'player',
  DM = 'dm',
}

function getRoleToNotify(step: Record<string, unknown>): Role | undefined {
  if (!Object.prototype.hasOwnProperty.call(step, 'initT')) return undefined;
  if (!Object.prototype.hasOwnProperty.call(step, 'ppt')) return undefined;
  if (!Object.prototype.hasOwnProperty.call(step, 'ppptT')) return undefined;
  if (!Object.prototype.hasOwnProperty.call(step, 'act')) return Role.Player;
  if (!Object.prototype.hasOwnProperty.call(step, 'pactT')) return Role.DM;
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

    const role = getRoleToNotify(Object.assign({}, after));
    logger.info('role: ', role);
    if (role === undefined) return null;

    // Some notification might have to be sent!

    // Get the corresponding run document
    const runId = context.params.runId as string;
    logger.info('Retrieve runs doc with id ', runId);
    const runDocRef = db.doc(`runs/${runId}`);
    const run = await runDocRef.get();
    const runData = run?.data() as { players: string[]; dm: string };
    logger.info('runData: ', JSON.stringify(runData));

    // Get uids
    let uids = [];
    if (role === Role.Player) {
      logger.info('Getting players uids');
      uids = runData.players;
    } else {
      logger.info('Getting DM uid');
      uids = [runData.dm];
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
      logger.info(`Getting doc ${path}`);
      const notifStatusDocRef = db.doc(path);
      const notifStatus = await notifStatusDocRef.get();
      if (notifStatus.exists) {
        const notifStatusData = notifStatus?.data() as {
          n: number | undefined;
          notified: boolean | undefined;
        };
        logger.info(`notifStatusData: ${JSON.stringify(notifStatusData)}`);
        // If the last step they saw is before the current step, they need to be notified,
        // or if they have not been notified yet for the current step, they need to be notified
        if (
          (notifStatusData.n !== undefined && notifStatusData.n < n) ||
          (notifStatusData.notified !== undefined && !notifStatusData.notified)
        ) {
          const userDocRef = db.doc(`users/${uid}`);
          const user = await userDocRef.get();
          if (user.exists) {
            const userData = user?.data() as {
              emailNotif: boolean | undefined;
            };
            // Did the user ask for email notifications?
            if (userData.emailNotif === true) {
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
              html: `<a href="https://visible-thoughts-writer.web.app/runs/${runId}">Click here</a> to continue the adventure, ${role}!`,
            },
          })
      )
    );

    return null;
  });
