import { AccountCircle } from '@mui/icons-material';
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
  Typography,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import isEmail from 'validator/lib/isEmail';
import { createInvite, Run } from '../firebase-app';

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

  const [email, setEmail] = useState<string>('');
  const [placeholder, setPlaceholder] = useState<string>('');

  const playersList = (
    <List>
      {run.players.length > 0 ? (
        run.players.map((player, index) => (
          <ListItem
            key={index}
            secondaryAction={
              <IconButton edge="end" aria-label="remove">
                <RemoveCircleIcon />
              </IconButton>
            }
          >
            <ListItemAvatar>
              <Avatar>
                <AccountCircle />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={player} />
          </ListItem>
        ))
      ) : (
        <ListItem key={0}>
          <ListItemText primary={'No player yet!'} />
        </ListItem>
      )}
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
