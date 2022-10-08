import { useState } from 'react';
import {
  Typography,
  Button,
  IconButton,
  TextField,
  FormControl,
  Box,
  Modal,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
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

  const onInvite = (): void => {
    if (!isEmail(email)) return;

    void (async function () {
      const inviteId = await createInvite(run.id, email);
      console.log('inviteId: ', inviteId);
    })();

    // Clear input
    setEmail('');
    setPlaceholder('Invite sent!');
  };

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
          <div>
            <Typography variant="h5">Players:</Typography>
            <div>
              <ul>
                {run.players.length > 0 ? (
                  run.players.map((player, index) => (
                    <li key={index}>{player}</li>
                  ))
                ) : (
                  <>No players yet!</>
                )}
              </ul>
            </div>
            <form>
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
                variant="contained"
                onClick={onInvite}
                disabled={!isEmail(email)}
              >
                Invite player
              </Button>
            </form>
          </div>
        </Box>
      </Modal>
    </div>
  ) : (
    <></>
  );
}

export default RunSettingsModal;
