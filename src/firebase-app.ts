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

  constructor(id: string, title: string) {
    this.id = id;
    this.title = title;
  }
}

const runsCol = collection(db, 'runs');

export async function getRuns(): Promise<Run[]> {
  const runsSnapshot = await getDocs(runsCol);
  return runsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return new Run(doc.id, data.title);
  });
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
  id: string;
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
  id: string;
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
    id: string,
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
    this.id = id;
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
}

export async function getSteps(runId: string): Promise<Step[]> {
  const stepsCol = collection(db, 'runs', runId, 'steps');
  const stepsSnapshot = await getDocs(stepsCol);
  return stepsSnapshot.docs.map((doc) => {
    const data = doc.data();
    console.log(data);
    return new Step(
      doc.id,
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
      doc.id,
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
    const stepRef = doc(db, 'runs', runId, 'steps', step.id);
    batch.set(stepRef, Object.assign({}, step));
  });
  await batch.commit();
}
