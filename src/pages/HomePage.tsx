import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  TextField,
  Typography,
} from '@mui/material';
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

  const onCreateRun = (event: React.FormEvent): void => {
    event.preventDefault();
    if (currentUser === null || currentUser === undefined) return;

    void (async function () {
      console.log('newTitle ', newTitle);
      const runId = await createRun(newTitle, currentUser.uid());
      console.log('runId ', newTitle);
      setNewRunId(runId);
    })();
  };

  const createRunForm =
    currentUser?.canDM() ?? false ? (
      <Box sx={{ mb: 2 }}>
        <form onSubmit={onCreateRun}>
          <FormControl>
            <TextField
              id="name-input"
              // label="Run name"
              name="name-input"
              variant="outlined"
              size={'small'}
              value={newTitle}
              onChange={(event) => {
                setNewTitle(event.target.value);
              }}
              inputProps={{ maxLength: 256 }}
            />
          </FormControl>

          <Button
            sx={{ ml: 2 }}
            type="submit"
            variant="contained"
            disabled={newTitle === ''}
          >
            Create run
            {newRunId !== undefined && (
              <Navigate replace to={`/runs/${newRunId}`} />
            )}
          </Button>
        </form>
      </Box>
    ) : (
      <></>
    );

  const renderRunsList = (): JSX.Element => {
    if (runs === undefined) {
      return <CircularProgress />;
    }

    return (
      <Box>
        <Typography variant="h5">Runs</Typography>
        <ul>
          {runs?.map((run) => (
            <li key={run.id}>
              <Link to={`/runs/${run.id}`}>{run.title}</Link>
            </li>
          ))}
        </ul>
      </Box>
    );
  };

  return (
    <div className="HomePage">
      <>
        <Navbar />
        <Box className="HomePage" sx={{ ml: 2, mt: 2 }}>
          {createRunForm}
          {renderRunsList()}
        </Box>
      </>
    </div>
  );
}

export default HomePage;
