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
  getSteps,
  getUserProfile,
  Invite,
  removePlayerFromRun,
  Run,
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
}

function RunSettingsModal({ run }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const handleOpen = (): void => setOpen(true);
  const handleClose = (): void => setOpen(false);

  const navigate = useNavigate();

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

  const exportRunButton = (
    <Button
      variant="contained"
      onClick={() => {
        void (async function () {
          const steps = await getSteps(run.id);
          const exportedRun = exportRun(run, steps);
          downloadToJSON(exportedRun);
        })();
      }}
    >
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
      <IconButton size="large" onClick={handleOpen} color="inherit">
        <SettingsIcon />
      </IconButton>
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
