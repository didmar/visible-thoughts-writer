import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Run, getRuns, createRun } from '../firebase-app';
import '../App.css';

function RunsPane(): JSX.Element {
  const [runs, setRuns] = useState<Run[]>([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    void (async function () {
      setRuns(await getRuns());
    })();
  }, []);

  return (
    <div className="RunsPane">
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
        <h1>Runs:</h1>
        <ul>
          {runs.map((run) => (
            <li key={run.id}>
              <Link to={`/runs/${run.id}`}>{run.title}</Link>
            </li>
          ))}
        </ul>
      </>
    </div>
  );
}

export default RunsPane;
