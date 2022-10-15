import { AccountCircle } from '@mui/icons-material';
import PendingIcon from '@mui/icons-material/Pending';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Avatar,
  Box,
  Button,
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
import isEmail from 'validator/lib/isEmail';
import {
  createInvite,
  getInvites,
  Invite,
  removePlayerFromRun,
  Run,
} from '../firebase-app';

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

  const [players, setPlayers] = useState<string[]>([]);
  const handleRemovePlayer = (playerId: string): void => {
    if (
      !confirm(
        `This will exclude player ${playerId} from the run. Are you sure?`
      )
    )
      return;

    void (async function () {
      await removePlayerFromRun(run.id, playerId);
    })();
    setPlayers(players.filter((other) => other !== playerId));
  };

  const [invites, setInvites] = useState<Invite[]>([]);

  const [email, setEmail] = useState<string>('');
  const [placeholder, setPlaceholder] = useState<string>('');

  useEffect(() => {
    console.log('RunSettingsModal > useEffect []');
    setPlayers(run.players);

    void (async function () {
      await getInvites(run.id).then((invites) => setInvites(invites));
    })();
  }, []);

  const playersList = (
    <List>
      {players.length > 0 ? (
        players.map((playerId, index) => (
          <ListItem
            key={index}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="remove"
                onClick={() => handleRemovePlayer(playerId)}
              >
                <RemoveCircleIcon />
              </IconButton>
            }
          >
            <ListItemAvatar>
              <Avatar>
                <AccountCircle />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={playerId} />
          </ListItem>
        ))
      ) : (
        <ListItem key={0}>
          <ListItemText primary={'No registered players'} />
        </ListItem>
      )}
    </List>
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

  return run !== undefined && run !== null ? (
    <div>
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
            <Typography sx={{ mt: 4 }} component="div" variant="h5">
              Players:
            </Typography>
            {playersList}
            {pendingInvitationsList}
            {invitePlayerForm}
          </Box>
        </Box>
      </Modal>
    </div>
  ) : (
    <></>
  );
}

export default RunSettingsModal;
