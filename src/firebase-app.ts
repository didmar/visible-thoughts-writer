import { FirebaseError, initializeApp } from 'firebase/app';
// import { getAnalytics } from "firebase/analytics";
import {
  addDoc,
  arrayRemove,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
} from '@firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions';
import conf from './conf.json';
import * as firebaseConfig from './firebase.creds.json';
import { withoutUndefinedValues } from './utils';

const app = initializeApp(firebaseConfig);

// const analytics = getAnalytics(app);

export const db = getFirestore(app);

export const auth = getAuth(app);

const functions = getFunctions(app);

// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
if (conf?.useEmulators) {
  console.log('Connecting to firestore emulator');
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('Connecting to auth emulator');
  connectAuthEmulator(auth, 'http://localhost:9099');
  console.log('Connecting to functions emulator');
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

const handleFirebaseError =
  (contextMsg?: string) =>
  (error: FirebaseError): never => {
    console.log('Firebase error context: ', contextMsg ?? 'no context');
    console.dir(error);
    throw error;
  };

// ============================
// Database types and functions
// ============================

export class Run {
  id: string;
  title: string;
  ltts: Record<string, Thought[]>;
  dm: string;
  players: string[];
  imported?: Timestamp;
  deleted?: boolean;

  constructor(
    id: string,
    title: string,
    ltts: Record<string, Thought[]>,
    dm: string,
    players: string[],
    imported?: Timestamp,
    deleted?: boolean
  ) {
    this.id = id;
    this.title = title;
    this.ltts = ltts;
    this.dm = dm;
    this.players = players;
    this.imported = imported;
    this.deleted = deleted;
  }

  sortedLtts(): Thought[] {
    if (this.ltts === undefined) return [];

    const arr: Array<[number, Thought[]]> = Object.entries(this.ltts).map(
      ([n, thoughts]) => [parseInt(n), thoughts]
    );
    arr.sort(([na], [nb]) => na - nb);
    return arr.flatMap(([, thoughts]) => thoughts);
  }

  static fromDocData(id: string, doc: DocumentData): Run {
    return new Run(
      id,
      doc.title,
      doc.ltts,
      doc.dm,
      doc.players,
      doc.imported,
      doc.deleted
    );
  }
}

const runsCol = collection(db, 'runs');

export async function getRuns(): Promise<Run[]> {
  const runsSnapshot = await getDocs(runsCol).catch(handleFirebaseError());
  return runsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return Run.fromDocData(doc.id, data);
  });
}

export async function getRun(runId: string): Promise<Run | undefined> {
  const runRef = doc(db, 'runs', runId);
  const runSnapshot = await getDoc(runRef).catch(handleFirebaseError());
  const data = runSnapshot.data();
  return data !== undefined ? Run.fromDocData(runId, data) : undefined;
}

export async function createRun(title: string, dm: string): Promise<string> {
  const doc = await addDoc(runsCol, { title, dm, players: [], ltts: {} }).catch(
    handleFirebaseError()
  );
  const runId = doc.id;

  // Create the first step as well
  const firstStep = createNextStep(undefined);
  await addStep(runId, firstStep);

  // Create a UserRunState for this run in the DM's profile
  await createUserRunState(dm, runId, Role.DM);

  return runId;
}

export async function createRunFromImport(
  title: string,
  dm: string,
  steps: Step[]
): Promise<string> {
  if (steps.length === 0) {
    throw new Error('Cannot import run with no steps!');
  }

  const ltts: Record<string, Thought[]> = {};
  steps.forEach((step) => {
    const stepLtts = collectLongTermThoughts(step);
    if (stepLtts.length > 0) {
      ltts[step.n.toString()] = stepLtts;
    }
  });

  const runDoc = await addDoc(runsCol, {
    title,
    dm,
    players: [],
    ltts,
    imported: Timestamp.now(),
  }).catch(handleFirebaseError());
  const runId = runDoc.id;

  try {
    // Firestore batches are limited to 500 documents, so we need to split up
    const batches = [];
    const nbBatches = Math.ceil(steps.length / 500);
    for (let index = 0; index < nbBatches; index++) {
      const splicedSteps = steps.splice(0, 499);
      const batch = writeBatch(db);
      splicedSteps.forEach((step) => {
        batch.set(doc(db, 'runs', runId, 'steps', step.n.toString()), step);
      });
      batches.push(batch);
    }
    const promises = batches.map(async (batch) => await batch.commit());
    await Promise.all(promises);
  } catch (error) {
    // Rollback the run creation
    console.log('ROLL BACK RUN CREATION BECAUSE OF ERROR: ', error);
    deleteDoc(doc(db, 'runs', runId)).catch(handleFirebaseError());
    throw error;
  }

  // Create a UserRunState for this run in the DM's profile
  await createUserRunState(dm, runId, Role.DM);

  return runId;
}

export function onRunsCreated(callback: (newRuns: Run[]) => void): void {
  onSnapshot(
    query(runsCol),
    (snapshot) => {
      const newRuns: Run[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          newRuns.push(Run.fromDocData(change.doc.id, data));
        }
      });

      if (newRuns.length > 0) {
        callback(newRuns);
      }
    },
    handleFirebaseError()
  );
}

export async function getRunUserProfiles(run: Run): Promise<UserProfile[]> {
  const profiles = await Promise.all(
    [run.dm, ...run.players].map(async (uid) => await getUserProfile(uid))
  );
  return profiles.filter((p) => p !== undefined) as UserProfile[];
}

export enum Role {
  Player = 'player',
  DM = 'dm',
  Both = 'both',
}

export function isDM(role: Role | null | undefined): boolean {
  return role === Role.DM || role === Role.Both;
}

export function isPlayer(role: Role | null | undefined): boolean {
  return role === Role.Player || role === Role.Both;
}

export const isOurTurnToWrite = (
  role: Role | null | undefined,
  lastStep: Step | undefined
): boolean => {
  const nextSection = getNextSectionForStep(lastStep);
  return (
    role !== undefined &&
    role !== null &&
    ((nextSection === Section.Act && isPlayer(role)) ||
      (nextSection === Section.PactT && isDM(role)))
  );
};

export async function getUserRoleInRun(
  uid: string,
  runId: string
): Promise<Role | null> {
  const run = await getRun(runId);
  if (run === undefined) return null;
  const isDM = run.dm === uid;
  const isPlayer = run.players.includes(uid);
  if (isDM && isPlayer) return Role.Both;
  if (isDM) return Role.DM;
  if (isPlayer) return Role.Player;
  return null;
}

export async function removePlayerFromRun(
  runId: string,
  uid: string
): Promise<void> {
  // Delete the player from the run
  await updateDoc(doc(db, `runs/${runId}`), {
    players: arrayRemove(uid),
  }).catch(handleFirebaseError());

  // Also delete the UserRunState for this run in the player's profile
  await deleteDoc(doc(db, 'users', uid, 'runs', runId)).catch(
    handleFirebaseError()
  );
}

// Steps and thought sections

export enum ThoughtType {
  Watsonian = 0,
  Doylist = 1,
  Meta = 2,
  Comment = 3,
}

export interface Thought {
  txt: string;
  type: ThoughtType;
  lt: boolean;
}

export interface Bullet {
  T: Thought[];
}

export interface TextYBR {
  txt: string;
  ybr: boolean;
}

export enum Section {
  InitT,
  Ppt,
  PpptT,
  Act,
  PactT,
  Out,
}

export function isThoughtSection(section: Section): boolean {
  return (
    section === Section.InitT ||
    section === Section.PpptT ||
    section === Section.PactT
  );
}

export function isYBRSection(section: Section): boolean {
  return section === Section.Act || section === Section.Out;
}

export function getNextSectionForStep(step?: Step): Section | undefined {
  if (step === undefined) return undefined; // no step yet, must create
  if (step.initT === undefined) return Section.InitT;
  if (step.ppt === undefined) return Section.Ppt;
  if (step.ppptT === undefined) return Section.PpptT;
  if (step.act === undefined) return Section.Act;
  if (step.pactT === undefined) return Section.PactT;
  if (step.out === undefined) return Section.Out;
  return undefined; // no next section for this step, go to the next
}

export function checkStepSectionsConsistency(step?: Step): void {
  if (step === undefined) return;
  if (step.initT === undefined && step.ppt !== undefined)
    throw new Error(`ppt without initT: ${JSON.stringify(step)}`);
  if (step.ppt === undefined && step.ppptT !== undefined)
    throw new Error(`ppptT without ppt: ${JSON.stringify(step)}`);
  if (step.ppptT === undefined && step.act !== undefined)
    throw new Error(`act without ppptT: ${JSON.stringify(step)}`);
  if (step.act === undefined && step.pactT !== undefined)
    throw new Error(`pactT without act: ${JSON.stringify(step)}`);
  if (step.pactT === undefined && step.out !== undefined)
    throw new Error(`out without pactT: ${JSON.stringify(step)}`);
}

export const skipInitT = (prevStep: Step | undefined): boolean =>
  // Skip initT if the last step had a YBR flag on outcome, or the outcome was skipped
  // subsequently to a YBR flag on action
  prevStep !== undefined && (prevStep.out == null || prevStep.out.ybr);

export const skipPptAndPpptT = (prevStep: Step | undefined): boolean =>
  prevStep?.out?.ybr ?? false;

export const createNextStep = (currentStep?: Step): Step => {
  if (currentStep === undefined) return new Step(1);
  const newStep = new Step(currentStep.n + 1);
  if (skipInitT(currentStep)) {
    newStep.initT = null;
    if (skipPptAndPpptT(currentStep)) {
      newStep.ppt = null;
      newStep.ppptT = null;
    }
  }
  return newStep;
};

export interface Step {
  n: number;
  initT?: Bullet[] | null;
  ppt?: string | null;
  ppptT?: Bullet[] | null;
  act?: TextYBR | null;
  pactT?: Bullet[] | null;
  out?: TextYBR | null;
}

export class Step {
  n: number;
  initT?: Bullet[] | null;
  ppt?: string | null;
  ppptT?: Bullet[] | null;
  act?: TextYBR | null;
  pactT?: Bullet[] | null;
  out?: TextYBR | null;
  constructor(
    n: number,
    initT?: Bullet[] | null,
    ppt?: string | null,
    ppptT?: Bullet[] | null,
    act?: TextYBR | null,
    pactT?: Bullet[] | null,
    out?: TextYBR | null
  ) {
    this.n = n;
    this.initT = initT;
    this.ppt = ppt;
    this.ppptT = ppptT;
    this.act = act;
    this.pactT = pactT;
    this.out = out;
  }

  static fromDocData(data: DocumentData): Step {
    return new Step(
      data.n,
      data.initT,
      data.ppt,
      data.ppptT,
      data.act,
      data.pactT,
      data.out
    );
  }
}

export const defaultThoughts = [
  { T: [{ lt: false, txt: '', type: ThoughtType.Watsonian }] },
];
export const defaultTextYBR = { txt: '', ybr: false };

async function getLastNSteps(runId: string, _limit: number): Promise<Step[]> {
  const stepsCol = collection(db, 'runs', runId, 'steps');
  const q = query(stepsCol, orderBy('n', 'desc'), limit(_limit));
  const stepsSnapshot = await getDocs(q).catch(handleFirebaseError());
  return stepsSnapshot.docs.reverse().map((doc) => {
    return Step.fromDocData(doc.data());
  });
}

export async function updateStep(
  runId: string,
  n: number,
  update: Partial<Step>
): Promise<void> {
  const docRef = doc(db, 'runs', runId, 'steps', n.toString());
  await updateDoc(docRef, update).catch(handleFirebaseError());
}

export async function addStep(runId: string, step: Step): Promise<void> {
  const docRef = doc(db, 'runs', runId, 'steps', step.n.toString());
  const obj = withoutUndefinedValues({ ...step });
  await setDoc(docRef, obj).catch(handleFirebaseError());
}

// Only used for populating the database
export async function addSteps(runId: string, steps: Step[]): Promise<void> {
  // Create a batch to write all the steps at once
  const batch = writeBatch(db);
  steps.forEach((step) => {
    const stepRef = doc(db, 'runs', runId, 'steps', step.n.toString());
    batch.set(stepRef, Object.assign({}, step));
  });

  // Also add the update of run's long-term thoughts
  const obj = steps.reduce(
    (acc, step) => ({
      ...acc,
      [`ltts.${step.n}`]: collectLongTermThoughts(step).map((ltt) =>
        Object.assign({}, ltt)
      ),
    }),
    {}
  );
  const docRef = doc(db, 'runs', runId);
  batch.update(docRef, obj);

  await batch.commit().catch(handleFirebaseError());
}

export async function getSteps(runId: string): Promise<Step[]> {
  const ref = collection(db, 'runs', runId, 'steps');
  const docSnap = await getDocs(ref).catch(handleFirebaseError());
  if (docSnap.empty) return [];
  const steps = docSnap.docs.map((doc) => Step.fromDocData(doc.data()));
  steps.sort((a, b) => a.n - b.n);
  return steps;
}

export async function getStepN(
  runId: string,
  n: number
): Promise<Step | undefined> {
  const docRef = doc(db, 'runs', runId, 'steps', n.toString());
  const docSnap = await getDoc(docRef).catch(handleFirebaseError());
  if (docSnap.exists()) {
    return Step.fromDocData(docSnap.data());
  } else {
    return undefined;
  }
}

export interface UpdatedSteps {
  added: Step[];
  modified: Step[];
}

export async function onStepsChanged(
  runId: string,
  callback: (updatedSteps: UpdatedSteps) => void
): Promise<void> {
  // Get the last 3 steps to start with
  const _steps = await getLastNSteps(runId, 3);
  const lastN = _steps.length > 0 ? _steps[_steps.length - 1].n : 1;
  if (lastN > 1) {
    const updatedSteps: UpdatedSteps = { added: _steps, modified: [] };
    callback(updatedSteps);
  }

  // For listening to added or modified steps, query starting from last step
  // in order to not fetch all the steps from the beginning!
  // (They will be loaded on demand if user scrolls up)
  const q = query(
    collection(db, 'runs', runId, 'steps'),
    where('n', '>=', lastN)
  );

  onSnapshot(
    q,
    (snapshot) => {
      const added: Step[] = [];
      const modified: Step[] = [];
      snapshot.docChanges().forEach((change) => {
        // console.log('change.type: ', change);
        // console.log('change.doc.data(): ', change.doc.data());

        if (change.type === 'added') {
          added.push(Step.fromDocData(change.doc.data()));
        } else if (change.type === 'modified') {
          modified.push(Step.fromDocData(change.doc.data()));
        }
      });

      if (added.length > 0 || modified.length > 0) {
        const updatedSteps: UpdatedSteps = { added, modified };
        callback(updatedSteps);
      }
    },
    handleFirebaseError()
  );
}

export function mergeStepsWithUpdates(
  steps: Step[] | undefined,
  updatedSteps: UpdatedSteps
): { merged: Step[]; lastStepModified: boolean } {
  if (steps === undefined)
    return {
      merged: [...updatedSteps.modified, ...updatedSteps.added],
      lastStepModified: false,
    };

  const stepsMap = new Map<number, Step>();
  steps.forEach((step) => stepsMap.set(step.n, step));
  updatedSteps.added.forEach((step) => stepsMap.set(step.n, step));
  updatedSteps.modified.forEach((step) => stepsMap.set(step.n, step));
  const merged = Array.from(stepsMap.values()).sort((a, b) => a.n - b.n);

  let lastStepModified = false;
  if (updatedSteps.modified.length > 0) {
    const lastStep = merged[merged.length - 1];
    const lastN = lastStep.n;
    for (const step of updatedSteps.modified) {
      if (step.n === lastN) {
        lastStepModified = true;
        break;
      }
    }
  }

  return {
    merged,
    lastStepModified,
  };
}

export function collectLongTermThoughts(step: Step): Thought[] {
  return [step.initT, step.ppptT, step.pactT].flatMap(collectSectionLtts);
}

export function collectSectionLtts(
  bullets: Bullet[] | null | undefined
): Thought[] {
  if (bullets === undefined || bullets === null) {
    return [];
  }
  return bullets.flatMap((bullet) => bullet.T.filter((thought) => thought.lt));
}

export async function updateRunLongTermThoughtsForStep(
  runId: string,
  n: number,
  stepLtts: Thought[]
): Promise<void> {
  const docRef = doc(db, 'runs', runId);
  const payload = {
    [`ltts.${n}`]: stepLtts.map((ltt) => Object.assign({}, ltt)),
  };
  await updateDoc(docRef, payload).catch(handleFirebaseError());
}

// Invites collection

export interface Invite {
  email: string;
}

export async function createInvite(
  runId: string,
  email: string
): Promise<string> {
  const colRef = collection(db, 'runs', runId, 'invites');
  const invite: Invite = { email };
  const doc = await addDoc(colRef, invite).catch(handleFirebaseError());
  return doc.id;
}

export async function getInvites(runId: string): Promise<Invite[]> {
  const colRef = collection(db, 'runs', runId, 'invites');
  const snapshot = await getDocs(colRef).catch(handleFirebaseError());
  return snapshot.docs.map((doc) => doc.data() as Invite);
}

// Users collection

export class UserProfile {
  id: string; // corresponds to the uid for firebase authentication
  name: string; // the user's screen name
  canDM: boolean; // whether the user can be a DM for a run, or not
  soundNotif: boolean; // whether the user wants to receive sound notifications, or not
  emailNotif: boolean; // whether the user wants to receive email notifications, or not

  constructor(
    id: string,
    name: string,
    canDM?: boolean,
    soundNotif?: boolean,
    emailNotif?: boolean
  ) {
    if (name.length > UserProfile.maxNameLength) throw Error('Name too long');
    this.id = id;
    this.name = name;
    this.canDM = canDM ?? true;
    this.soundNotif = soundNotif ?? false;
    this.emailNotif = emailNotif ?? false;
  }

  static fromDocData(data?: DocumentData): UserProfile | undefined {
    if (data === undefined) return undefined;
    return new UserProfile(
      data.id,
      data.name,
      data.canDM,
      data.soundNotif,
      data.emailNotif
    );
  }

  static maxNameLength = 64;
}

export async function createUserProfile(
  uid: string,
  name: string
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    Object.assign({}, new UserProfile(uid, name))
  ).catch(handleFirebaseError());
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | undefined> {
  const runRef = doc(db, 'users', uid);
  const runSnapshot = await getDoc(runRef).catch(handleFirebaseError());
  return UserProfile.fromDocData(runSnapshot.data());
}

export async function getOrCreateUserProfile(
  uid: string,
  name: string
): Promise<UserProfile> {
  const profile = await getUserProfile(uid);
  if (profile === undefined) {
    const newProfile = new UserProfile(uid, name);
    await setDoc(doc(db, 'users', uid), Object.assign({}, newProfile)).catch(
      handleFirebaseError()
    );
    return newProfile;
  } else {
    return profile;
  }
}

export async function updateUserProfile(
  uid: string,
  update: Partial<UserProfile>
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, update).catch(handleFirebaseError());
}

export async function onUserProfileChanged(
  uid: string,
  callback: (userProfile: UserProfile) => void
): Promise<void> {
  onSnapshot(
    doc(db, 'users', uid),
    (doc) => {
      const userProfile = UserProfile.fromDocData(doc.data());
      if (userProfile !== undefined) callback(userProfile);
    },
    handleFirebaseError()
  );
}

// Document type for the runs sub-collection of the users collection.
// Keeps track of what was already notified to the user, and what their role is.
export class UserRunState {
  role: Role; // whether the user is a player of the run, a DM, or both
  lastStepNotified: number; // last step for which the user has been notified that it was their turn
  // (when ready for the action section for the player, or the post-action thoughts section for the DM).

  constructor(role: Role, lastStepNotified?: number) {
    this.role = role;
    this.lastStepNotified = lastStepNotified ?? 0;
  }

  static fromDocData(data?: DocumentData): UserRunState | undefined {
    if (data === undefined) return undefined;
    return new UserRunState(data.role, data.lastStepNotified);
  }
}

export async function createUserRunState(
  userId: string,
  runId: string,
  role: Role
): Promise<void> {
  const status = new UserRunState(role);
  await setDoc(
    doc(db, 'users', userId, 'runs', runId),
    Object.assign({}, status)
  ).catch(handleFirebaseError());
}

export async function updateUserRunState(
  userId: string,
  runId: string,
  role: Role | null | undefined,
  lastStepNotified: number
): Promise<void> {
  if (role === null || role === undefined) return;
  const docRef = doc(db, 'users', userId, 'runs', runId);
  const update: Partial<UserRunState> = { role, lastStepNotified };
  await setDoc(docRef, update, { merge: true }).catch(handleFirebaseError());
}

// ===============
// Cloud functions
// ===============

export const confirmInvite = httpsCallable(functions, 'confirmInvite');
export const deleteRun = httpsCallable(functions, 'deleteRun');
