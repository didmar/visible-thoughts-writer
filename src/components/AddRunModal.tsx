import PostAddIcon from '@mui/icons-material/PostAdd';
import UploadIcon from '@mui/icons-material/Upload';
import {
  Box,
  Button,
  FormControl,
  Modal,
  TextField,
  Typography,
} from '@mui/material';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import { FirebaseError } from 'firebase/app';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import '../App.css';
import { useAuth } from '../components/Auth';
import { ExportedRun, importRun } from '../export';
import { createRun, createRunFromImport, Run } from '../firebase-app';

function NewRunForm(): JSX.Element {
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
            name="name-input"
            variant="outlined"
            size={'small'}
            value={newTitle}
            onChange={(event) => {
              setNewTitle(event.target.value);
            }}
            inputProps={{ maxLength: Run.MAX_TITLE_LENGTH }}
            placeholder="Enter run name..."
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
      <Typography>{"Current user can't be a DM!"}</Typography>
    );

  return (
    <Box sx={{ display: 'flex', mb: 2 }}>
      {createRunForm}
      {newRunId !== undefined && <Navigate replace to={`/runs/${newRunId}`} />}
    </Box>
  );
}

function ImportRunForm(): JSX.Element {
  const [newRunId, setNewRunId] = useState<string | undefined>(undefined);
  const currentUser = useAuth();

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
          Upload JSON file
        </Button>
      </label>
    ) : (
      <Typography>{"Current user can't be a DM!"}</Typography>
    );
  return (
    <Box sx={{ display: 'flex', mb: 2 }}>
      {importJSONButton}
      {newRunId !== undefined && <Navigate replace to={`/runs/${newRunId}`} />}
    </Box>
  );
}

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '75%',
  maxWidth: '800px',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

enum AddRunAction {
  NewRun = 'New run',
  ImportRun = 'Import run',
}

const actions = [
  { id: AddRunAction.NewRun, icon: <PostAddIcon /> },
  {
    id: AddRunAction.ImportRun,
    icon: <UploadIcon />,
  },
];

export default function AddRunModal(): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const [selectedAction, setSelectedAction] = useState<
    AddRunAction | undefined
  >(undefined);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        top: 'unset',
        left: 'unset',
      }}
    >
      <SpeedDial
        ariaLabel="SpeedDial openIcon example"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
        }}
        icon={<SpeedDialIcon />}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.id}
            icon={action.icon}
            tooltipTitle={action.id}
            onClick={() => {
              setSelectedAction(action.id);
              setOpen(true);
            }}
          />
        ))}
      </SpeedDial>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setSelectedAction(undefined);
        }}
      >
        <Box sx={style}>
          <Typography id="addrun-modal-title" variant="h3">
            {selectedAction}
          </Typography>
          <Box sx={{ marginTop: 2, padding: 2 }}>
            {selectedAction === AddRunAction.NewRun && <NewRunForm />}
            {selectedAction === AddRunAction.ImportRun && <ImportRunForm />}
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
