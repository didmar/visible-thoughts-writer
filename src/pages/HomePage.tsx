import { Box, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import '../App.css';
import { useAuth } from '../components/Auth';
import Navbar from '../components/Navbar';
import { createRun, onRunsCreated, Run } from '../firebase-app';

function HomePage(): JSX.Element {
  const [runs, setRuns] = useState<Run[] | undefined>(undefined);
  const [newRuns, setNewRuns] = useState<Run[] | undefined>(undefined);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newRunId, setNewRunId] = useState<string | undefined>(undefined);

  const currentUser = useAuth();

  // Set up a listener
  useEffect(() => {
    console.log('HomePage > useEffect [] ');
    onRunsCreated(setNewRuns);
  }, []);

  // When new runs are created, add them to the list of runs
  useEffect(() => {
    console.log('HomePage > useEffect [newRuns]: ', newRuns);
    if (newRuns !== undefined) {
      const updateRuns = runs === undefined ? newRuns : [...runs, ...newRuns];
      setRuns(updateRuns);
    }
  }, [newRuns]);

  const renderCreateRun = (): JSX.Element => {
    if (currentUser == null || !currentUser.canDM()) {
      return <></>;
    }

    return (
      <Box sx={{ padding: 2 }}>
        <input
          placeholder="Title..."
          onChange={(event) => {
            setNewTitle(event.target.value);
          }}
        />
        <Button
          variant="contained"
          sx={{ ml: 2 }}
          disabled={newTitle === ''}
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
      </Box>
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
    <div className="HomePage">
      <>
        <Navbar />
        {renderCreateRun()}
        {renderRunsList()}
      </>
    </div>
  );
}

export default HomePage;
