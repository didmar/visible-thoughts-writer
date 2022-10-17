import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Modal,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import {
  getUserProfile,
  updateUserProfile,
  UserProfile,
} from '../firebase-app';
import { playDing } from '../utils';
import { useAuth } from './Auth';

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

function UserProfileModal(): JSX.Element {
  const [open, setOpen] = useState(false);
  const handleOpen = (): void => setOpen(true);
  const handleClose = (): void => setOpen(false);

  const currentUser = useAuth();

  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(
    undefined
  );
  const [newName, setNewName] = useState<string | undefined>(undefined);
  const [soundNotif, setSoundNotif] = useState<boolean | undefined>(undefined);
  const [emailNotif, setEmailNotif] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    console.log('UserProfileModal > useEffect []');
    const uid = currentUser?.uid();
    if (uid === undefined) return;
    void (async function () {
      await getUserProfile(uid).then((user) => {
        if (user === undefined) return;
        setUserProfile(user);
        setNewName(user.name);
        setSoundNotif(user.soundNotif);
        setEmailNotif(user.emailNotif);
      });
    })();
  }, []);

  if (
    currentUser === undefined ||
    currentUser === null ||
    userProfile === undefined
  )
    return <></>;

  const onNameEdit = (event: FormEvent): void => {
    event.preventDefault();
    if (newName === undefined) throw new Error('newName is undefined');
    void (async function () {
      await updateUserProfile(userProfile.id, { name: newName });
    })();
    setUserProfile({ ...userProfile, name: newName });
  };

  const nameEditForm = (
    <Box sx={{ mt: 2 }}>
      <form onSubmit={onNameEdit}>
        <FormControl>
          <TextField
            error={newName === ''}
            id="name-input"
            label="Screen name"
            name="name-input"
            variant="outlined"
            size={'small'}
            value={newName}
            onChange={(event) => {
              setNewName(event.target.value);
            }}
          />
        </FormControl>

        <Button
          sx={{ ml: 2 }}
          type="submit"
          variant="contained"
          disabled={newName === '' || newName === userProfile.name}
        >
          Change
        </Button>
      </form>
    </Box>
  );

  const soundTestButton = (
    <Button
      sx={{ ml: 2 }}
      variant="outlined"
      startIcon={
        soundNotif === true ? (
          <NotificationsActiveIcon />
        ) : (
          <NotificationsOffIcon />
        )
      }
      disabled={soundNotif !== true}
      onClick={() => {
        void (async function () {
          await playDing();
        })();
      }}
    >
      Test sound
    </Button>
  );

  const handleChangeSoundNotif = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const newSoundNotif = event.target.checked;
    setSoundNotif(newSoundNotif);
    void (async function () {
      await updateUserProfile(userProfile.id, { soundNotif: newSoundNotif });
    })();
    setUserProfile({ ...userProfile, soundNotif: newSoundNotif });
  };

  const soundNotifSwitch = (
    <FormControlLabel
      control={
        <Switch checked={soundNotif} onChange={handleChangeSoundNotif} />
      }
      label={
        <>
          {'Sound notifications'}
          {soundTestButton}
        </>
      }
    />
  );

  const handleChangeEmailNotif = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const newEmailNotif = event.target.checked;
    setEmailNotif(newEmailNotif);
    void (async function () {
      await updateUserProfile(userProfile.id, { emailNotif: newEmailNotif });
    })();
    setUserProfile({ ...userProfile, emailNotif: newEmailNotif });
  };

  const emailNotifSwitch = (
    <FormControlLabel
      control={
        <Switch checked={emailNotif} onChange={handleChangeEmailNotif} />
      }
      label="Email notifications"
    />
  );

  return (
    <div>
      <MenuItem onClick={handleOpen}>
        <SettingsIcon />
        <p>Profile</p>
      </MenuItem>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h3">
            Profile settings
          </Typography>
          <Box>
            {nameEditForm}
            <FormGroup sx={{ mt: 2 }}>
              {soundNotifSwitch}
              {emailNotifSwitch}
            </FormGroup>
          </Box>
        </Box>
      </Modal>
    </div>
  );
}

export default UserProfileModal;
