import { AccountCircle } from '@mui/icons-material';
import EmailIcon from '@mui/icons-material/Email';
import PendingIcon from '@mui/icons-material/Pending';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import UndoIcon from '@mui/icons-material/Undo';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  Modal,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  getUserRolesInRun,
  Invite,
  Role,
  Run,
  RunStatus,
  runStatusTooltip,
  updateRunParticipants,
  UserProfile,
} from '../firebase-app';
import '../styles.css';
import { downloadToJSON, orderedArrayWithoutDupes } from '../utils';

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

interface Participant {
  userProfile: UserProfile;
  roles: Set<Role>;
}

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

  const [participants, setParticipants] = useState<Participant[]>([]);

  const onRoleChange = (
    participant: Participant,
    role: Role,
    checked: boolean
  ): void => {
    // Update our local state
    if (checked) participant.roles.add(role);
    else participant.roles.delete(role);
    const newParticipants = participants.map((p) =>
      // Recreate an object with our update,
      // or use the original if it's not the one we're updating
      p.userProfile.id === participant.userProfile.id
        ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          ({
            ...p,
            roles: participant.roles,
          } as Participant)
        : p
    );
    setParticipants(newParticipants);
  };

  const handleRemoveParticipant = (participant: Participant): void => {
    if (participant.roles.has(Role.Admin))
      throw new Error(`Can't remove an admin from the participants!`);

    if (
      !confirm(
        `This will exclude participant ${participant.userProfile.name} from the run. Are you sure?`
      )
    )
      return;

    const uid = participant.userProfile.id;
    setParticipants(participants.filter((p) => p.userProfile.id !== uid));
  };

  const [invites, setInvites] = useState<Invite[]>([]);

  const [email, setEmail] = useState<string>('');
  const [placeholder, setPlaceholder] = useState<string>('');

  useEffect(() => {
    console.log('RunSettingsModal > useEffect []');

    const participantIds = orderedArrayWithoutDupes([
      run.admin,
      ...run.dms,
      ...run.players,
    ]);
    void (async function () {
      const userProfiles = await Promise.all(
        participantIds.map(async (uid) => {
          const p = await getUserProfile(uid);
          if (p === undefined) throw new Error(`Participant ${uid} not found!`);
          return p;
        })
      );
      const _participants = userProfiles.map((p) => {
        return { userProfile: p, roles: getUserRolesInRun(p.id, run) };
      });
      setParticipants(_participants);

      await getInvites(run.id).then((invites) => setInvites(invites));
    })();
  }, []);

  useEffect(() => {
    console.log('RunSettingsModal > useEffect [participants]');

    const dms: string[] = [];
    const players: string[] = [];
    participants.forEach((p) => {
      if (p.roles.has(Role.DM)) dms.push(p.userProfile.id);
      if (p.roles.has(Role.Player)) players.push(p.userProfile.id);
    });

    void (async function () {
      await updateRunParticipants(run.id, dms, players);
    })();
  }, [participants]);

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

  const participantsTableRows = participants.map((participant, index) => (
    <TableRow key={index}>
      {/* Participant name column */}
      <TableCell component="th" scope="row">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <Tooltip title="Registered player">
            <AccountCircle sx={{ mr: 1 }} />
          </Tooltip>
          <Typography>{participant.userProfile.name}</Typography>
        </Box>
      </TableCell>
      {/* Role checkboxes columns */}
      {[Role.Admin, Role.DM, Role.Player].map((role, index) => {
        return (
          <TableCell key={index} className="roleCell">
            <Tooltip title={`Toggle ${role.valueOf()} role`}>
              <Checkbox
                checked={participant.roles.has(role)}
                onChange={(_, checked) => {
                  onRoleChange(participant, role, checked);
                }}
                inputProps={{ 'aria-label': 'controlled' }}
                disabled={role === Role.Admin}
              />
            </Tooltip>
          </TableCell>
        );
      })}
      {/* Remove participant column */}
      <TableCell>
        {!participant.roles.has(Role.Admin) && (
          <Tooltip title="Remove participant">
            <IconButton
              aria-label="remove"
              onClick={() => handleRemoveParticipant(participant)}
            >
              <RemoveCircleIcon />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  ));

  const invitesTableRows = invites.map((invite, index) => (
    <TableRow key={100 + index}>
      {/* Participant name column */}
      <TableCell component="th" scope="row">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            paddingTop: '8px',
            paddingBottom: '8px',
          }}
        >
          <Tooltip title="Pending invitation">
            <PendingIcon sx={{ mr: 1 }} />
          </Tooltip>
          <Typography>{invite.email}</Typography>
        </Box>
      </TableCell>
      {/* Empty role checkboxes columns */}
      <TableCell></TableCell>
      <TableCell></TableCell>
      <TableCell></TableCell>
      {/* Empty remove participant column */}
      <TableCell></TableCell>
    </TableRow>
  ));

  const participantsList = (
    <TableContainer component={Paper}>
      <Table aria-label="table" className="participantsTable">
        <TableHead>
          <TableRow>
            <TableCell>Participants</TableCell>
            <TableCell align="center" className="roleCell">
              Admin
            </TableCell>
            <TableCell align="center" className="roleCell">
              DM
            </TableCell>
            <TableCell align="center" className="roleCell">
              Player
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {participantsTableRows}
          {invitesTableRows}
        </TableBody>
      </Table>
    </TableContainer>
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
            <Divider sx={{ mt: 2, mb: 2 }} />
            {participantsList}
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
