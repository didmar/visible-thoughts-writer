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
    const docRef = db.doc(`runs/${runId}`);
    const run = await docRef.get();
    const runData = run?.data() as { players: string[]; dm: string };
    logger.info('runData: ', runData);

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

    // Collect the email addresses for those uids
    const emails = await Promise.all(
      uids.map(async (uid) => await admin.auth().getUser(uid))
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
