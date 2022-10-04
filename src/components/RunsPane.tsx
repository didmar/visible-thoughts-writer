import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Run, getRuns, createRun } from '../firebase-app';
import '../App.css';
import { AppBar, Button, Toolbar, Typography } from '@mui/material';
import HelpAndFeedback from './HelpAndFeedback';
import UserMenu from './UserMenu';
import { useAuth } from './Auth';

function RunsPane(): JSX.Element {
  const [runs, setRuns] = useState<Run[] | undefined>(undefined);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newRunId, setNewRunId] = useState<string | undefined>(undefined);

  const currentUser = useAuth();

  useEffect(() => {
    void (async function () {
      setRuns(await getRuns());
    })();
  }, []);

  const renderCreateRun = (): JSX.Element => {
    if (currentUser == null || !currentUser.canDM()) {
      return <></>;
    }

    return (
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
              const runId = await createRun(newTitle, currentUser.uid());
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
    );
  };

  const renderRunsList = (): JSX.Element => {
    if (runs === undefined) {
      return <>Loading...</>;
    }

    return (
      <div style={{ padding: 5 }}>
        <h1>Runs</h1>
        <ul>
          {runs?.map((run) => (
            <li key={run.id}>
              <Link to={`/runs/${run.id}`}>{run.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };

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
        {renderCreateRun()}
        {renderRunsList()}
      </>
    </div>
  );
}

export default RunsPane;
