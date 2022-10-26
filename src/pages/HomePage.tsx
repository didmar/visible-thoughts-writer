import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  TextField,
  Typography,
} from '@mui/material';
import { FirebaseError } from 'firebase/app';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import '../App.css';
import { useAuth } from '../components/Auth';
import Navbar from '../components/Navbar';
import { ExportedRun, importRun } from '../export';
import {
  createRun,
  createRunFromImport,
  onRunsCreated,
  Run,
} from '../firebase-app';

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
      // Exclude deleted runs, they should not show up for anyone
      const newRunsNotDeleted = newRuns.filter((run) => run.deleted !== true);
      const updateRuns =
        runs === undefined
          ? newRunsNotDeleted
          : [...runs, ...newRunsNotDeleted];
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
        </Button>
      </form>
    ) : (
      <></>
    );

  const selectFile = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (currentUser === null || currentUser === undefined) {
      alert('You must be logged in to import a run.');
      return;
    }
    if (!currentUser.canDM()) {
      alert("You don't have the permission to be DM.");
      return;
    }
    if (event.target.files === null || event.target.files.length === 0) return;
    if (event.target.files.length !== 1) {
      alert('Please select only ONE file!');
      return;
    }
    const file = event.target.files[0];
    if (file.type !== 'application/json') {
      alert('Please select a JSON file!');
      return;
    }
    console.log('file: ', file);

    const reader = new FileReader();
    void (async function () {
      reader.onload = async (e) => {
        if (e.target === null) return;
        const content: ExportedRun = JSON.parse(e.target.result as string);
        const { title, steps } = importRun(content);
        const userId = currentUser.uid();
        createRunFromImport(title, userId, steps)
          .then((runId) => {
            setNewRunId(runId);
          })
          .catch((err: FirebaseError) => {
            console.error('Error importing run:', err);
            alert(
              `Error importing run, format might be invalid:\n: ${err.message}`
            );
          });
      };
      reader.readAsText(file);
    })();
  };

  const importJSONButton =
    currentUser?.canDM() ?? false ? (
      <label htmlFor="btn-upload">
        <input
          id="btn-upload"
          name="btn-upload"
          style={{ display: 'none' }}
          type="file"
          onChange={selectFile}
        />
        <Button
          className="btn-import"
          sx={{ ml: 2 }}
          variant="outlined"
          component="span"
        >
          Import
        </Button>
      </label>
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
          {runs
            ?.filter((run) => run.deleted !== true)
            .map((run) => (
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
          <Box sx={{ display: 'flex', mb: 2 }}>
            {createRunForm}
            {importJSONButton}
            {newRunId !== undefined && (
              <Navigate replace to={`/runs/${newRunId}`} />
            )}
          </Box>
          {renderRunsList()}
        </Box>
      </>
    </div>
  );
}

export default HomePage;
