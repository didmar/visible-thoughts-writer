import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Run, getRuns, createRun } from '../firebase-app';
import '../App.css';
import { Button } from '@mui/material';

function RunsPane(): JSX.Element {
  const [runs, setRuns] = useState<Run[] | undefined>(undefined);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newRunId, setNewRunId] = useState<string | undefined>(undefined);

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
        <Button
          variant="contained"
          onClick={() => {
            void (async function () {
              console.log('newTitle ', newTitle);
              const runId = await createRun(newTitle);
              console.log('runId ', newTitle);
              setNewRunId(runId);
            })();
          }}
        >
          Create Run
          {newRunId !== undefined && (
            <Navigate replace to={`/runs/${newRunId}`} />
          )}
        </Button>
        <h1>{runs !== undefined ? 'Runs:' : 'Loading...'}</h1>
        <ul>
          {runs?.map((run) => (
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
