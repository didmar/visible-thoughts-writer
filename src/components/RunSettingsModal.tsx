import { AccountCircle } from '@mui/icons-material';
import PendingIcon from '@mui/icons-material/Pending';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Avatar,
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Modal,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import isEmail from 'validator/lib/isEmail';
import { exportRun } from '../export';
import {
  createInvite,
  deleteRun,
  getInvites,
  getRunUserProfiles,
  getSteps,
  getUserProfile,
  Invite,
  removePlayerFromRun,
  Run,
  updateRunDesc,
  updateRunTitle,
  UserProfile,
} from '../firebase-app';
import { downloadToJSON } from '../utils';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '75%',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

interface Props {
  run: Run;
  initOpen: boolean;
}

function RunSettingsModal({ run, initOpen }: Props): JSX.Element {
  const [open, setOpen] = useState(initOpen);
  const handleOpen = (): void => setOpen(true);
  const handleClose = (): void => setOpen(false);

  const navigate = useNavigate();

  const [newTitle, setNewTitle] = useState<string>(run.title);
  const [newDesc, setNewDesc] = useState<string>(run.desc);
  const [players, setPlayers] = useState<UserProfile[]>([]);

  const handleRemovePlayer = (playerId: string): void => {
    const name = players.find((player) => player.id === playerId)?.name;
    if (name === undefined) throw new Error('Player not found!');

    if (
      !confirm(`This will exclude player ${name} from the run. Are you sure?`)
    )
      return;

    void (async function () {
      await removePlayerFromRun(run.id, playerId);
    })();
    setPlayers(players.filter((other) => other.id !== playerId));
  };

  const [invites, setInvites] = useState<Invite[]>([]);

  const [email, setEmail] = useState<string>('');
  const [placeholder, setPlaceholder] = useState<string>('');

  useEffect(() => {
    console.log('RunSettingsModal > useEffect []');

    const playerIds = run.players;
    void (async function () {
      const userProfiles = await Promise.all(
        playerIds.map(async (playerId) => {
          const player = await getUserProfile(playerId);
          if (player === undefined)
            throw new Error(`Player ${playerId} not found!`);
          return player;
        })
      );
      setPlayers(userProfiles);

      await getInvites(run.id).then((invites) => setInvites(invites));
    })();
  }, []);

  const onTitleEdit = (event: FormEvent): void => {
    event.preventDefault();
    if (newTitle === undefined) throw new Error('newTitle is undefined');
    void (async function () {
      await updateRunTitle(run.id, newTitle);
    })();
  };

  const titleEditForm = (
    <Box sx={{ mt: 2 }}>
      <form onSubmit={onTitleEdit}>
        <FormControl
          sx={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <TextField
            sx={{ flexBasis: '100%' }}
            error={newTitle === ''}
            id="name-input"
            label="Title"
            name="name-input"
            variant="outlined"
            size={'small'}
            value={newTitle}
            onChange={(event) => {
              setNewTitle(event.target.value);
            }}
            inputProps={{ maxLength: Run.MAX_TITLE_LENGTH }}
          />
          <Button
            sx={{ ml: 2, width: '100px' }}
            type="submit"
            variant="contained"
            disabled={newTitle === '' || newTitle === run.title}
          >
            Change
          </Button>
        </FormControl>
      </form>
    </Box>
  );

  const onDescEdit = (event: FormEvent): void => {
    event.preventDefault();
    if (newDesc === undefined) throw new Error('newDesc is undefined');
    void (async function () {
      await updateRunDesc(run.id, newDesc);
    })();
  };

  const descEditForm = (
    <Box sx={{ mt: 2, width: '100%' }}>
      <form onSubmit={onDescEdit}>
        <FormControl
          sx={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <TextField
            multiline={true}
            sx={{ flexBasis: '100%' }}
            error={newDesc === ''}
            id="desc-input"
            label="Description"
            placeholder="Enter a description for your run!"
            name="desc-input"
            variant="outlined"
            value={newDesc}
            onChange={(event) => {
              setNewDesc(event.target.value);
            }}
            inputProps={{ maxLength: Run.MAX_DESC_LENGTH }}
          />
          <Button
            sx={{
              ml: 2,
              width: '100px',
              height: '40px',
            }}
            type="submit"
            variant="contained"
            disabled={newDesc === '' || newDesc === run.desc}
          >
            Change
          </Button>
        </FormControl>
      </form>
    </Box>
  );

  const playersList = (
    <>
      <Typography sx={{ mt: 4 }} component="div" variant="h5">
        Players:
      </Typography>

      <List>
        {players.length > 0 ? (
          players.map((player, index) => (
            <ListItem
              key={index}
              secondaryAction={
                <IconButton
                  edge="start"
                  aria-label="remove"
                  onClick={() => handleRemovePlayer(player.id)}
                >
                  <RemoveCircleIcon />
                </IconButton>
              }
            >
              <Tooltip title="Registered player">
                <ListItemAvatar>
                  <Avatar>
                    <AccountCircle />
                  </Avatar>
                </ListItemAvatar>
              </Tooltip>
              <ListItemText primary={player.name} />
            </ListItem>
          ))
        ) : (
          <ListItem key={0}>
            <ListItemText primary={'No registered players'} />
          </ListItem>
        )}
      </List>
    </>
  );

  const pendingInvitationsList = (
    <List>
      {invites.map((invite, index) => (
        <ListItem key={index}>
          <Tooltip title="Pending invitation">
            <ListItemAvatar>
              <Avatar>
                <PendingIcon />
              </Avatar>
            </ListItemAvatar>
          </Tooltip>
          <ListItemText primary={invite.email} />
        </ListItem>
      ))}
    </List>
  );

  const onInvite = (event: FormEvent): void => {
    event.preventDefault();

    if (!isEmail(email)) return;

    void (async function () {
      const inviteId = await createInvite(run.id, email);
      console.log('inviteId: ', inviteId);
      setInvites([...invites, { email }]);
    })();

    // Clear input
    setEmail('');
    setPlaceholder('Invite sent!');
  };

  const invitePlayerForm = (
    <Box sx={{ mt: 2 }}>
      <form onSubmit={onInvite}>
        <FormControl>
          <TextField
            error={email !== '' && !isEmail(email)}
            id="email-input"
            label="Email"
            name="email-input"
            variant="outlined"
            size={'small'}
            helperText={placeholder}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setPlaceholder('');
            }}
          />
        </FormControl>

        <Button
          sx={{ ml: 2 }}
          type="submit"
          variant="contained"
          disabled={!isEmail(email)}
        >
          Invite player
        </Button>
      </form>
    </Box>
  );

  const onDeleteRun = (): void => {
    if (!confirm(`This will PERMANENTLY DELETE this run. Are you sure?`))
      return;

    void (async function () {
      await deleteRun(run.id)
        .then((_) => {
          alert(
            'Run successfully deleted! You will be redirected to the home page.'
          );
          navigate('/');
        })
        .catch((error: unknown) => {
          console.error('Error deleting run: ', error);
          alert(`Error deleting run, please report it as a bug.`);
        });
    })();
  };

  const onExportRun = (): void => {
    void (async function () {
      const steps = await getSteps(run.id);
      const userProfiles = await getRunUserProfiles(run);
      const exportedRun = exportRun(run, userProfiles, steps);
      downloadToJSON(exportedRun);
    })();
  };

  const exportRunButton = (
    <Button variant="contained" onClick={onExportRun}>
      Export run
    </Button>
  );

  const deleteRunButton = (
    <Box sx={{ ml: 2 }}>
      <Button variant="contained" color="error" onClick={onDeleteRun}>
        Delete run
      </Button>
    </Box>
  );

  return run !== undefined && run !== null ? (
    <Box>
      {/* If starting as already opened, don't show the button to open it */}
      {!initOpen && (
        <IconButton size="large" onClick={handleOpen} color="inherit">
          <SettingsIcon />
        </IconButton>
      )}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h3">
            Run settings
          </Typography>
          <Box>
            {titleEditForm}
            {descEditForm}
            {playersList}
            {pendingInvitationsList}
            {invitePlayerForm}
            <Divider sx={{ mt: 2 }} />
            <Box sx={{ mt: 2, display: 'flex' }}>
              {exportRunButton}
              {deleteRunButton}
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  ) : (
    <></>
  );
}

export default RunSettingsModal;
