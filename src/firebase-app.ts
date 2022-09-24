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

enum ThoughtType {
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

export interface Step {
  n: number;
  initT: Bullet[];
  ppt: string;
  pptYBR: boolean;
  ppptT: Bullet[];
  act: string;
  actYBR: boolean;
  pactT: Bullet[];
  out: string;
  outYBR: boolean;
}

export class Step {
  n: number;
  initT: Bullet[];
  ppt: string;
  pptYBR: boolean;
  ppptT: Bullet[];
  act: string;
  actYBR: boolean;
  pactT: Bullet[];
  out: string;
  outYBR: boolean;
  constructor(
    n: number,
    initT: Bullet[],
    ppt: string,
    pptYBR: boolean,
    ppptT: Bullet[],
    act: string,
    actYBR: boolean,
    pactT: Bullet[],
    out: string,
    outYBR: boolean
  ) {
    this.n = n;
    this.initT = initT;
    this.ppt = ppt;
    this.pptYBR = pptYBR;
    this.ppptT = ppptT;
    this.act = act;
    this.actYBR = actYBR;
    this.pactT = pactT;
    this.out = out;
    this.outYBR = outYBR;
  }

  static fromDocData(data: DocumentData): Step {
    return new Step(
      data.n,
      data.initT,
      data.ppt,
      data.pptYBR,
      data.ppptT,
      data.act,
      data.actYBR,
      data.pactT,
      data.out,
      data.outYBR
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
      data.pptYBR,
      data.ppptT,
      data.act,
      data.actYBR,
      data.pactT,
      data.out,
      data.outYBR
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
      data.pptYBR,
      data.ppptT,
      data.act,
      data.actYBR,
      data.pactT,
      data.out,
      data.outYBR
    );
  });
}

export async function addStep(runId: string, step: Step): Promise<string> {
  const stepsCol = collection(db, 'runs', runId, 'steps');
  const doc = await addDoc(stepsCol, Object.assign({}, step));
  return doc.id;
}

// Only used for populating the database
export async function addSteps(runId: string, steps: Step[]): Promise<void> {
  const batch = writeBatch(db);
  steps.forEach((step) => {
    const stepRef = doc(db, 'runs', runId, 'steps', step.n.toString());
    batch.set(stepRef, Object.assign({}, step));
  });
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

export async function updateRunLongTermThoughts(
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
