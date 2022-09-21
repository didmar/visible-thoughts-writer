import { useEffect, useState } from "react";
import { db } from "./firebase-app";
import { getDocs, collection, addDoc } from "firebase/firestore";
import './App.css';

function App() {
  const [newTitle, setNewTitle] = useState("");
  const [runs, setRuns] = useState([]);
  const runsColRef = collection(db, "runs");

  const createRun = async () => {
    await addDoc(runsColRef, {title: newTitle});
  }

  useEffect(() => {
    const getRuns = async () => {
      const data = await getDocs(runsColRef);
      setRuns(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    }
    getRuns()
  }, [])

  return (
    <div className="App">
      <input placeholder="Title..." onChange={(event) => {
        setNewTitle(event.target.value);
      }}/>
      <button onClick={createRun}>Create Run</button>
      {
        runs.map((run) => {
          return <div>
            {run.id}: {run.title}
            </div>
        })
      }
    </div>
  );
}

export default App;
