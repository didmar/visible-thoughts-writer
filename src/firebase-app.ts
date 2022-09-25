import { initializeApp } from 'firebase/app';
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
import firebaseConfig from './firebase.creds.json';

const app = initializeApp(firebaseConfig);

// const analytics = getAnalytics(app);

export const db = getFirestore(app);

// ============================
// Database types and functions
// ============================

export class Run {
  id: string;
  title: string;
  ltts: Record<string, Thought[]>;

  constructor(id: string, title: string, ltts: Record<string, Thought[]>) {
    this.id = id;
    this.title = title;
    this.ltts = ltts;
  }

  lttsToArray(): Thought[] {
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
  const runsSnapshot = await getDocs(runsCol);
  return runsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return new Run(doc.id, data.title, data.ltts);
  });
}

export async function getRun(runId: string): Promise<Run | undefined> {
  const runRef = doc(db, 'runs', runId);
  const runSnapshot = await getDoc(runRef);
  const data = runSnapshot.data();
  if (data !== undefined) {
    return new Run(runId, data.title, data.ltts);
  } else {
    return undefined;
  }
}

export async function createRun(title: string): Promise<string> {
  const doc = await addDoc(runsCol, { title });
  return doc.id;
}

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

export function getNextSectionForStep(step?: Step): Section | undefined {
  if (step === undefined || step.initT === undefined) return Section.InitT;
  if (step.ppt === undefined) return Section.Ppt;
  if (step.ppptT === undefined) return Section.PpptT;
  if (step.act === undefined) return Section.Act;
  if (step.pactT === undefined) return Section.PactT;
  if (step.out === undefined) return Section.Out;
  return undefined; // no next section for this step, go to the next
}

export interface Step {
  n: number;
  initT?: Bullet[];
  ppt?: string | null;
  ppptT?: Bullet[];
  act?: TextYBR;
  pactT?: Bullet[];
  out?: TextYBR | null;
}

export class Step {
  n: number;
  initT?: Bullet[];
  ppt?: string | null;
  ppptT?: Bullet[];
  act?: TextYBR;
  pactT?: Bullet[];
  out?: TextYBR | null;
  constructor(
    n: number,
    initT?: Bullet[],
    ppt?: string | null,
    ppptT?: Bullet[],
    act?: TextYBR,
    pactT?: Bullet[],
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
  const stepsSnapshot = await getDocs(stepsCol);
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
  const stepsSnapshot = await getDocs(q);
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

export async function addStep(runId: string, step: Step): Promise<void> {
  const docRef = doc(db, 'runs', runId, 'steps', step.n.toString());
  const obj = Object.entries(step).reduce(
    (acc, [key, value]) =>
      value !== undefined ? { ...acc, [key]: value } : acc,
    {}
  );
  console.log('obj: ', obj);
  await setDoc(docRef, obj);
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

  await batch.commit();
}

export async function getStepN(
  runId: string,
  n: number
): Promise<Step | undefined> {
  const docRef = doc(db, 'runs', runId, 'steps', n.toString());
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return Step.fromDocData(docSnap.data());
  } else {
    return undefined;
  }
}

function collectLongTermThoughts(step: Step): Thought[] {
  return [step.initT, step.ppptT, step.pactT].flatMap((bullets) => {
    if (bullets === undefined) {
      return [];
    }
    return bullets.flatMap((bullet) =>
      bullet.T.filter((thought) => thought.lt)
    );
  });
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
  await updateDoc(docRef, {
    [`ltts.${n}`]: ltts.map((ltt) => Object.assign({}, ltt)),
  });
}
