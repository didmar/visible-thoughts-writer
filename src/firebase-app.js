import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "@firebase/firestore";

import { firebaseConfig } from "./firebase-config";

const app = initializeApp(firebaseConfig);

// const analytics = getAnalytics(app);

export const db = getFirestore(app);