import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Run, getRuns, createRun } from '../firebase-app';
import '../App.css';
import { AppBar, Button, Toolbar, Typography } from '@mui/material';
import HelpAndFeedback from './HelpAndFeedback';
import UserMenu from './UserMenu';

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
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Visible Thoughts Writer
            </Typography>
            <HelpAndFeedback />
            <UserMenu />
          </Toolbar>
        </AppBar>
        <div style={{ padding: 5 }}>
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
        </div>
        <div style={{ padding: 5 }}>
          <h1>{runs !== undefined ? 'Runs:' : 'Loading...'}</h1>
          <ul>
            {runs?.map((run) => (
              <li key={run.id}>
                <Link to={`/runs/${run.id}`}>{run.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </>
    </div>
  );
}

export default RunsPane;
