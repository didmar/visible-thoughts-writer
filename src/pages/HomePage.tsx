import { Box, Button, FormControl, TextField } from '@mui/material';
import { FirebaseError } from 'firebase/app';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import '../App.css';
import { useAuth } from '../components/Auth';
import Navbar from '../components/Navbar';
import RunsListing from '../components/RunsListing';
// import SimpleRunsListing from '../components/SimpleRunsListing';
import { ExportedRun, importRun } from '../export';
import { createRun, createRunFromImport, Run } from '../firebase-app';

function HomePage(): JSX.Element {
  const [newTitle, setNewTitle] = useState<string>('');
  const [newRunId, setNewRunId] = useState<string | undefined>(undefined);

  const currentUser = useAuth();

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
            inputProps={{ maxLength: Run.MAX_TITLE_LENGTH }}
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

  return (
    <div className="HomePage">
      <>
        <Navbar />
        <Box
          className="HomePage"
          sx={{
            m: 2,
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '1024px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', mb: 2 }}>
            {createRunForm}
            {importJSONButton}
            {newRunId !== undefined && (
              <Navigate replace to={`/runs/${newRunId}`} />
            )}
          </Box>
          <RunsListing userId={currentUser?.uid()} />
          {/* <SimpleRunsListing userId={currentUser?.uid()} /> */}
        </Box>
      </>
    </div>
  );
}

export default HomePage;
