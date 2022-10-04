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
} from '@firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from './firebase.creds.json';
import { withoutUndefinedValues } from './utils';

const app = initializeApp(firebaseConfig);

// const analytics = getAnalytics(app);

export const db = getFirestore(app);

export const auth = getAuth(app);

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
  return doc.id;
}

export enum Role {
  Player = 'player',
  DM = 'dm',
}

export async function getUserRoleInRun(
  uid: string,
  runId: string
): Promise<Role | null> {
  const run = await getRun(runId);
  if (run === undefined) return null;
  if (run.dm === uid) return Role.DM;
  if (run.players.includes(uid)) return Role.Player;
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

export type SectionContent = Bullet[] | TextYBR | string | null;

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

export async function getSteps(runId: string): Promise<Step[]> {
  const stepsCol = collection(db, 'runs', runId, 'steps');
  const stepsSnapshot = await getDocs(stepsCol).catch(handleFirebaseError());
  return stepsSnapshot.docs.map((doc) => {
    const data = doc.data();
    console.log(data);
    return new Step(
      data.n,
      data.initT,
      data.ppt,
      data.ppptT,
      data.act,
      data.pactT,
      data.out
    );
  });
}

export async function getLastNSteps(
  runId: string,
  _limit: number
): Promise<Step[]> {
  const stepsCol = collection(db, 'runs', runId, 'steps');
  const q = query(stepsCol, orderBy('n', 'desc'), limit(_limit));
  const stepsSnapshot = await getDocs(q).catch(handleFirebaseError());
  return stepsSnapshot.docs.reverse().map((doc) => {
    const data = doc.data();
    // console.log(data);
    return new Step(
      data.n,
      data.initT,
      data.ppt,
      data.ppptT,
      data.act,
      data.pactT,
      data.out
    );
  });
}

export async function updateStep(
  runId: string,
  n: number,
  update: Partial<Step>
): Promise<void> {
  const docRef = doc(db, 'runs', runId, 'steps', n.toString());
  console.log('update: ', update);
  await updateDoc(docRef, update).catch(handleFirebaseError());
}

export async function addStep(runId: string, step: Step): Promise<void> {
  const docRef = doc(db, 'runs', runId, 'steps', step.n.toString());
  const obj = withoutUndefinedValues({ ...step });
  console.log('obj: ', obj);
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

// Users collection

export class UserProfile {
  id: string; // corresponds to the uid for firebase authentication
  canDM: boolean; // whether the user can be a DM for a run, or not
  plays?: string[]; // reference to a run
  dms?: string[]; // reference to a run

  constructor(id: string, canDM: boolean, plays?: string[], dms?: string[]) {
    this.id = id;
    this.canDM = canDM;
    this.plays = plays;
    this.dms = dms;
  }
}

export async function createUserProfile(uid: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    Object.assign({}, new UserProfile(uid, false))
  ).catch(handleFirebaseError());
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | undefined> {
  const runRef = doc(db, 'users', uid);
  const runSnapshot = await getDoc(runRef).catch(handleFirebaseError());
  const data = runSnapshot.data();
  if (data !== undefined) {
    return new UserProfile(uid, data.role, data.plays, data.dms);
  } else {
    return undefined;
  }
}

export async function getOrCreateUserProfile(
  uid: string
): Promise<UserProfile> {
  const profile = await getUserProfile(uid);
  if (profile === undefined) {
    const newProfile = new UserProfile(uid, false);
    await setDoc(doc(db, 'users', uid), Object.assign({}, newProfile)).catch(
      handleFirebaseError()
    );
    return newProfile;
  } else {
    return profile;
  }
}
