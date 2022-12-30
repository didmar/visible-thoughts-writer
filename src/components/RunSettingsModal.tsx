import { AccountCircle } from '@mui/icons-material';
import EmailIcon from '@mui/icons-material/Email';
import PendingIcon from '@mui/icons-material/Pending';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import UndoIcon from '@mui/icons-material/Undo';
import {
  Avatar,
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Modal,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TagsInput from 'react-tagsinput';
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
  RunStatus,
  runStatusTooltip,
  UserProfile,
} from '../firebase-app';
import '../styles.css';
import { downloadToJSON } from '../utils';

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

interface Props {
  initRun: Run;
  initOpen: boolean;
  onClose?: (updatedRun: Run) => void;
}

function RunSettingsModal({ initRun, initOpen, onClose }: Props): JSX.Element {
  const [run] = useState<Run>(initRun);
  const [open, setOpen] = useState(initOpen);
  const handleOpen = (): void => setOpen(true);
  const handleClose = (): void => {
    if (
      edited &&
      !confirm(
        `Are you sure you want to close without saving? Changes will be lost.`
      )
    )
      return;

    setOpen(false);
    if (onClose !== undefined) onClose(run);
  };

  const navigate = useNavigate();

  const [newTitle, setNewTitle] = useState<string>(run.title);
  const [newDesc, setNewDesc] = useState<string>(run.desc ?? '');
  const [newTags, setNewTags] = useState<string[]>(run.tags ?? []);
  const [newStatus, setNewStatus] = useState<RunStatus>(
    run.status ?? RunStatus.InProgress
  );
  const [newPriv, setNewPriv] = useState<boolean>(run.priv ?? false);
  const [edited, setEdited] = useState(false);

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

  const saveChanges = (): void => {
    if (newTitle === undefined) throw new Error('newTitle is undefined');
    if (newDesc === undefined) throw new Error('newDesc is undefined');
    if (newTags === undefined) throw new Error('newTags is undefined');

    void (async function () {
      // FIXME: not optimal, should do a single update instead.
      // But this can wait until we have all the run settings implemented.
      if (newTitle !== run.title) await run.updateTitle(newTitle);
      if (newDesc !== run.desc) await run.updateDesc(newDesc);
      if (newTags !== run.tags) await run.updateTags(newTags);
      if (newStatus !== run.status) await run.updateStatus(newStatus);
      if (newPriv !== run.priv) await run.updatePriv(newPriv);
    })();
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    saveChanges();
    setEdited(false);
  };

  const onReset = (): void => {
    setNewTitle(run.title);
    setNewDesc(run.desc);
    setNewTags(run.tags);
    setNewStatus(run.status);
    setEdited(false);
  };

  const editForm = (
    <Box sx={{ mt: 2 }}>
      <form onSubmit={onSubmit}>
        <FormControl
          sx={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <TextField
            sx={{ flexBasis: '100%' }}
            error={!Run.isValidTitle(newTitle)}
            id="name-input"
            label="Title"
            name="name-input"
            variant="outlined"
            size={'small'}
            value={newTitle}
            onChange={(event) => {
              setNewTitle(event.target.value);
              setEdited(true);
            }}
            inputProps={{ maxLength: Run.MAX_TITLE_LENGTH }}
          />
          <TextField
            multiline={true}
            sx={{ flexBasis: '100%', mt: 1 }}
            error={!Run.isValidDesc(newDesc)}
            id="desc-input"
            label="Description"
            placeholder="Enter a description for your run!"
            name="desc-input"
            variant="outlined"
            value={newDesc}
            onChange={(event) => {
              setNewDesc(event.target.value);
              setEdited(true);
            }}
            inputProps={{ maxLength: Run.MAX_DESC_LENGTH }}
          />
          <TagsInput
            value={newTags}
            onChange={(tags: string[]) => {
              setNewTags(tags);
              setEdited(true);
            }}
          />

          {/* Put status toggle, visibility toggle and save/reset buttons on the same row */}
          <Box
            sx={{
              mt: 1,
              display: 'flex',
              flexFlow: 'row wrap',
              justifyContent: 'space-between',
            }}
          >
            <ToggleButtonGroup
              sx={{ flex: 0 }}
              value={newStatus}
              exclusive
              onChange={(_, newStatus) => {
                if (newStatus !== null) {
                  setNewStatus(newStatus);
                  setEdited(true);
                }
              }}
            >
              {Object.entries(RunStatus).map(([_, status]) => (
                <ToggleButton key={status} size={'small'} value={status}>
                  <Tooltip title={runStatusTooltip(status)}>
                    <Typography>{status}</Typography>
                  </Tooltip>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <FormControlLabel
              sx={{ flex: 0 }}
              control={
                <Switch
                  checked={newPriv}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setNewPriv(event.target.checked);
                    setEdited(true);
                  }}
                />
              }
              label={'Private?'}
            />

            <Box
              sx={{
                flex: 0,
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: 1,
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                type="submit"
                variant="contained"
                disabled={
                  !edited ||
                  !Run.isValidTitle(newTitle) ||
                  !Run.isValidDesc(newDesc)
                }
                startIcon={<SaveIcon />}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                disabled={!edited}
                onClick={onReset}
                sx={{ ml: 1 }}
                startIcon={<UndoIcon />}
              >
                Reset
              </Button>
            </Box>
          </Box>
        </FormControl>
      </form>
    </Box>
  );

  const playersList = (
    <>
      <Typography sx={{ mt: 1 }} component="div" variant="h5">
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
          startIcon={<EmailIcon />}
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
            {editForm}
            <Divider sx={{ mt: 2 }} />
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
