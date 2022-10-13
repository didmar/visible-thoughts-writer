import { FirebaseError, initializeApp } from 'firebase/app';
// import { getAnalytics } from "firebase/analytics";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  writeBatch,
  doc,
  query,
  orderBy,
  limit,
  DocumentData,
  getDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  where,
  connectFirestoreEmulator,
} from '@firebase/firestore';
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from 'firebase/functions';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import * as firebaseConfig from './firebase.creds.json';
import { withoutUndefinedValues } from './utils';
import conf from './conf.json';

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

  constructor(
    id: string,
    title: string,
    ltts: Record<string, Thought[]>,
    dm: string,
    players: string[]
  ) {
    this.id = id;
    this.title = title;
    this.ltts = ltts;
    this.dm = dm;
    this.players = players;
  }

  lttsToArray(): Thought[] {
    if (this.ltts === undefined) return [];

    const thoughts: Thought[] = [];
    const ns: number[] = Object.keys(this.ltts)
      .map((id) => parseInt(id))
      .sort((a, b) => (a < b ? a : b));
    for (const n of ns) {
      thoughts.push(...this.ltts[n.toString()]);
    }

    return thoughts;
  }
}

const runsCol = collection(db, 'runs');

export async function getRuns(): Promise<Run[]> {
  const runsSnapshot = await getDocs(runsCol).catch(handleFirebaseError());
  return runsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return new Run(doc.id, data.title, data.ltts, data.dm, data.players);
  });
}

export async function getRun(runId: string): Promise<Run | undefined> {
  const runRef = doc(db, 'runs', runId);
  const runSnapshot = await getDoc(runRef).catch(handleFirebaseError());
  const data = runSnapshot.data();
  if (data !== undefined) {
    return new Run(runId, data.title, data.ltts, data.dm, data.players);
  } else {
    return undefined;
  }
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

export function onRunsCreated(callback: (newRuns: Run[]) => void): void {
  onSnapshot(
    query(runsCol),
    (snapshot) => {
      const newRuns: Run[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          newRuns.push(
            new Run(change.doc.id, data.title, data.ltts, data.dm, data.players)
          );
        }
      });

      if (newRuns.length > 0) {
        callback(newRuns);
      }
    },
    handleFirebaseError()
  );
}

export enum Role {
  Player = 'player',
  DM = 'dm',
  Both = 'both',
}

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

export type SectionContent =
  | { kind: 'bullets'; value: Bullet[] }
  | { kind: 'ybrtext'; value: TextYBR }
  | { kind: 'text'; value: string }
  | null;

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
        console.log('change.type: ', change);
        console.log('change.doc.data(): ', change.doc.data());

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

function collectLongTermThoughts(step: Step): Thought[] {
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

export async function getRunLongTermThoughts(
  runId: string
): Promise<Thought[]> {
  const run = await getRun(runId);
  if (run !== undefined) {
    return run.lttsToArray();
  } else {
    return [];
  }
}

export async function updateRunLongTermThoughtsForStep(
  runId: string,
  n: number
): Promise<void> {
  const stepN = await getStepN(runId, n);
  if (stepN === undefined) {
    return;
  }

  const ltts: Thought[] = collectLongTermThoughts(stepN);

  const docRef = doc(db, 'runs', runId);
  const payload = {
    [`ltts.${n}`]: ltts.map((ltt) => Object.assign({}, ltt)),
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

// Users collection

export class UserProfile {
  id: string; // corresponds to the uid for firebase authentication
  canDM: boolean; // whether the user can be a DM for a run, or not
  emailNotif: boolean; // whether the user wants to receive email notifications, or not

  constructor(id: string, canDM?: boolean, emailNotif?: boolean) {
    this.id = id;
    this.canDM = canDM ?? true;
    this.emailNotif = emailNotif ?? false;
  }

  static fromDocData(data?: DocumentData): UserProfile | undefined {
    if (data === undefined) return undefined;
    return new UserProfile(data.id, data.canDM, data.emailNotif);
  }
}

export async function createUserProfile(uid: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    Object.assign({}, new UserProfile(uid))
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
  uid: string
): Promise<UserProfile> {
  const profile = await getUserProfile(uid);
  if (profile === undefined) {
    const newProfile = new UserProfile(uid);
    await setDoc(doc(db, 'users', uid), Object.assign({}, newProfile)).catch(
      handleFirebaseError()
    );
    return newProfile;
  } else {
    return profile;
  }
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
  role: Role,
  lastStepNotified: number
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'runs', runId);
  const update: Partial<UserRunState> = { role, lastStepNotified };
  await setDoc(docRef, update, { merge: true }).catch(handleFirebaseError());
}

// ===============
// Cloud functions
// ===============

export const confirmInvite = httpsCallable(functions, 'confirmInvite');
