import { initializeApp } from 'firebase/app';
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from '@firebase/firestore';
import { getDocs, collection, addDoc } from 'firebase/firestore';

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
  const toto = await addDoc(runsCol, { title });
  return toto.id;
}
