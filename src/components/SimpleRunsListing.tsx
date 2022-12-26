import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onRunsCreated, Run } from '../firebase-app';

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
    }
  }, [newRuns]);

  const renderRunsList = (runs: Run[]): JSX.Element =>
    runs.length > 0 ? (
      <ul>
        {runs.map((run) => (
          <li key={run.id}>
            <Link to={`/runs/${run.id}`}>{run.title}</Link> (
            {run.nsteps ?? '???'} steps)
          </li>
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
      ? runs.filter((run) => run.dm === userId || run.players.includes(userId))
      : [];
  const otherRuns = runs.filter(
    (run) =>
      userId === undefined ||
      (run.dm !== userId && !run.players.includes(userId))
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
