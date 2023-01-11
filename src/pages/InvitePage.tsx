import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../components/Auth';
import StyledFirebaseAuth, { uiConfig } from '../components/StyledFirebaseAuth';
import { auth, confirmInvite } from '../firebase-app';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

enum InviteStatus {
  NotConfirmed,
  Pending,
  Confirmed,
  Error,
}

const InvitePage = (): JSX.Element => {
  const search = useLocation().search;
  const token = new URLSearchParams(search).get('token');
  if (token === null) {
    return <>Missing token!</>;
  }
  const [runId, inviteId] = token.split('-');
  if (inviteId === undefined) {
    return <>Invalid token!</>;
  }
  const [status, setStatus] = useState<InviteStatus>(InviteStatus.NotConfirmed);

  const currentUser = useAuth();

  const confirm = (): void => {
    void (async () => {
      setStatus(InviteStatus.Pending);
      await confirmInvite(token)
        .then((_) => {
          setStatus(InviteStatus.Confirmed);
        })
        .catch((error) => {
          console.error('Error returned by confirmInvite: ', error);
          setStatus(InviteStatus.Error);
        });
    })();
  };

  if (currentUser === null) {
    return (
      <Box sx={style}>
        <Typography>
          <p>You have been invited to join a run!</p>
          <p>Please sign-in to accept the invitation.</p>
        </Typography>
        <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={auth} />
      </Box>
    );
  }
  if (status === InviteStatus.Confirmed) {
    return (
      <Box sx={style}>
        <Typography>
          <p>Done!</p>
          <p>You will be redirect shortly to the run page</p>
          <p>
            If nothing happens,
            <Link to={{ pathname: `/runs/${runId}` }}>click here</Link>
          </p>
        </Typography>
        <Navigate replace to={`/runs/${runId}`} />
      </Box>
    );
  }
  return (
    <Box sx={style}>
      {currentUser === undefined ? (
        <CircularProgress />
      ) : (
        <Typography>
          <p>Signed in as {currentUser.email()}.</p>
          <p>
            You will be added as a participant with this account, is that ok?
          </p>
        </Typography>
      )}
      {status === InviteStatus.Error ? (
        <Typography>
          <p>Error!</p>
        </Typography>
      ) : status === InviteStatus.Pending ? (
        <CircularProgress />
      ) : (
        <Button variant="contained" onClick={confirm}>
          Confirm
        </Button>
      )}
    </Box>
  );
};

export default InvitePage;
