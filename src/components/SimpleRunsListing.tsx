import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getUsersUidToName,
  isRunParticipant,
  onRunsCreated,
  Run,
} from '../firebase-app';

interface Props {
  userId: string | undefined;
}

/**
 * Alternative to RunsListing that does not use Algolia search indexes.
 * Useful for testing along with Firestore emulator.
 */
function SimpleRunsListing({ userId }: Props): JSX.Element {
  const [runs, setRuns] = useState<Run[]>([]);
  const [newRuns, setNewRuns] = useState<Run[] | undefined>(undefined);
  const [adminUidToName, setAdminUidToName] = useState<Map<string, string>>(
    new Map()
  );

  // Set up a listener
  useEffect(() => {
    console.log('HomePage > useEffect [] ');
    onRunsCreated(setNewRuns);
  }, []);

  // When new runs are created, add them to the list of runs
  useEffect(() => {
    console.log('HomePage > useEffect [newRuns]: ', newRuns);
    if (newRuns !== undefined) {
      // Exclude deleted runs, they should not show up for anyone
      const newRunsNotDeleted = newRuns.filter((run) => !run.deleted);
      const updateRuns = [...runs, ...newRunsNotDeleted];
      setRuns(updateRuns);
      // Get the mapping from DM uids to their names
      // (FIXME: Could be optimized to only get the new DMs)
      void (async function () {
        const _adminUidToName = await getUsersUidToName([
          ...new Set(updateRuns.map((run) => run.admin)),
        ]);
        setAdminUidToName(_adminUidToName);
      })();
    }
  }, [newRuns]);

  const renderRunListItem = (run: Run): JSX.Element => (
    <>
      {run.priv && `🔒 `}
      {!run.priv || (userId !== undefined && isRunParticipant(userId, run)) ? (
        <Link to={`/runs/${run.id}`}>{run.title}</Link>
      ) : (
        run.title
      )}{' '}
      ({run.nsteps ?? '???'} steps) by {adminUidToName.get(run.admin) ?? '???'}
    </>
  );

  const renderRunsList = (runs: Run[]): JSX.Element =>
    runs.length > 0 ? (
      <ul>
        {runs.map((run) => (
          <li key={run.id}>{renderRunListItem(run)}</li>
        ))}
      </ul>
    ) : (
      <ul>No runs</ul>
    );

  if (runs === undefined) {
    return <CircularProgress />;
  }
  const yourRuns =
    userId !== undefined
      ? runs.filter((run) => isRunParticipant(userId, run))
      : [];
  const otherRuns = runs.filter(
    (run) => userId === undefined || !isRunParticipant(userId, run)
  );

  return (
    <Box>
      {yourRuns.length > 0 ? (
        <>
          <Typography variant="h5">Your runs</Typography>
          {renderRunsList(yourRuns)}
          <Typography variant="h5">Other runs</Typography>
          {renderRunsList(otherRuns)}
        </>
      ) : (
        <>
          <Typography variant="h5">Runs</Typography>
          {renderRunsList(runs)}
        </>
      )}
    </Box>
  );
}

export default SimpleRunsListing;
