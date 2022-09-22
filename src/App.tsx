import { useEffect, useState } from 'react';
import { Run, getRuns, createRun } from './firebase-app';
import './App.css';

function App(): JSX.Element {
  const [runs, setRuns] = useState<Run[]>([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    void (async function () {
      setRuns(await getRuns());
    })();
  }, []);

  return (
    <div className="App">
      <>
        <input
          placeholder="Title..."
          onChange={(event) => {
            setNewTitle(event.target.value);
          }}
        />
        <button
          onClick={() => {
            void async function () {
              await createRun(newTitle);
            };
          }}
        >
          Create Run
        </button>
        {runs.map((run) => (
          <div key={run.id}>
            {run.id}: {run.title}
          </div>
        ))}
      </>
    </div>
  );
}

export default App;
