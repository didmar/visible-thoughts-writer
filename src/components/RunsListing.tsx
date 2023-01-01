import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NavigationIcon from '@mui/icons-material/Navigation';
import PersonIcon from '@mui/icons-material/Person';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Fab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import algoliasearch from 'algoliasearch';
import { useEffect, useState } from 'react';
import { Hit } from 'react-instantsearch-core';
import {
  ClearRefinements,
  Configure,
  connectHits,
  InstantSearch,
  MenuSelect,
  Pagination,
  RefinementList,
  SearchBox,
  SortBy,
  ToggleRefinement,
} from 'react-instantsearch-dom';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import TagsInput from 'react-tagsinput';

import conf from '../conf.json';
import {
  getUserProfile,
  getUsersUidToName,
  isRunParticipant,
  Run,
  RunStatus,
  runStatusTooltip,
  UserProfile,
} from '../firebase-app';
import '../styles.css';
import { noop } from '../utils';

const searchClient = algoliasearch(conf.algoliaAppId, conf.algoliaAPIKeyRuns);

// Format of a document in the Algolia index
interface IndexedDoc {
  objectID: string;
  title: string;
  admin: string;
  dms: string[];
  players: string[];
  nsteps: number;
  status: RunStatus;
  tags: string[];
  priv: boolean;
  deleted: boolean;
}

/**
 * Transforms the indexed Algolia document into a Run object, for convenience.
 */
const indexedDocToRun = (doc: IndexedDoc): Run => {
  return new Run(
    doc.objectID,
    doc.title,
    '', // desc
    doc.tags,
    doc.status,
    {}, // ltts
    doc.admin,
    doc.dms,
    doc.players,
    doc.nsteps,
    doc.priv ?? false, // Legacy runs are not private, default is public
    doc.deleted,
    undefined // imported
  );
};

const createStatusChip = (status: RunStatus): JSX.Element => {
  const tooltip = runStatusTooltip(status);
  switch (status) {
    case RunStatus.InProgress:
      return (
        <Tooltip title={tooltip}>
          <Chip color="warning" label="in progress" />
        </Tooltip>
      );
    case RunStatus.Completed:
      return (
        <Tooltip title={tooltip}>
          <Chip color="success" label="completed" />
        </Tooltip>
      );
    case RunStatus.Archived:
      return (
        <Tooltip title={tooltip}>
          <Chip variant="outlined" label="archived" />
        </Tooltip>
      );
  }
};

const renderRunTableRow = (
  run: Run,
  adminName: string | undefined,
  userProfile: UserProfile | undefined,
  navigate: NavigateFunction
): JSX.Element => {
  const isParticipant =
    userProfile !== undefined && isRunParticipant(userProfile.id, run);
  const hasAccess =
    !run.priv || isParticipant || (userProfile?.isReviewer ?? false);
  return (
    <TableRow
      key={run.id}
      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
    >
      <TableCell>
        <Tooltip title={hasAccess ? 'Go to this run' : "You don't have access"}>
          <span>
            <Fab
              size="small"
              color="primary"
              aria-label="go to run"
              onClick={() => {
                if (hasAccess) navigate(`/runs/${run.id}`);
              }}
              disabled={!hasAccess}
            >
              <NavigationIcon />
            </Fab>
          </span>
        </Tooltip>
      </TableCell>
      <TableCell style={{ padding: 0 }}>
        {isParticipant && (
          <Tooltip title={'You are a participant'}>
            <PersonIcon />
          </Tooltip>
        )}
      </TableCell>

      <TableCell component="th" scope="row" style={{ maxWidth: '500px' }}>
        {run.priv && '🔒 '}
        {run.title}
      </TableCell>
      <TableCell>{adminName ?? '-'}</TableCell>
      <TableCell align="right">{run.nsteps}</TableCell>
      <TableCell>{createStatusChip(run.status)}</TableCell>
      <TableCell>
        {/* Reuse TagsInput to display the tags, disabling the input */}
        {run.tags !== undefined && (
          <TagsInput
            className="react-tagsinput--view"
            value={run.tags}
            disabled={true}
            onChange={noop}
            renderLayout={(tagComponents, _) => <span>{tagComponents}</span>}
          />
        )}
      </TableCell>
    </TableRow>
  );
};

const CustomHits = connectHits<
  { hits: Array<Hit<IndexedDoc>>; userId: string | undefined },
  IndexedDoc
>(({ hits, userId }) => {
  const [runs, setRuns] = useState<Run[] | undefined>(undefined);
  const [adminUidToName, setAdminUidToName] = useState<
    Map<string, string> | undefined
  >(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(
    undefined
  );

  useEffect(() => {
    const _runs = hits.map((hit) => indexedDocToRun(hit));
    setRuns(_runs);
    const adminUids = [...new Set(_runs.map((run) => run.admin))];
    void (async function () {
      const _adminUidToName = await getUsersUidToName(adminUids);
      setAdminUidToName(_adminUidToName);
      const _userProfile =
        userId !== undefined ? await getUserProfile(userId) : undefined;
      setUserProfile(_userProfile);
    })();
  }, [hits]);

  const navigate = useNavigate();
  return adminUidToName === undefined || runs === undefined ? (
    <Box
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <CircularProgress />
    </Box>
  ) : (
    <TableContainer component={Paper}>
      <Table aria-label="table">
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Admin</TableCell>
            <TableCell>Steps</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Tags</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map((run) =>
            renderRunTableRow(
              run,
              adminUidToName.get(run.admin),
              userProfile,
              navigate
            )
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

interface Props {
  userId: string | undefined;
}

function RunsListing({ userId }: Props): JSX.Element {
  return (
    <InstantSearch searchClient={searchClient} indexName="prod_runs">
      <Configure hitsPerPage={20} filters={'deleted:false'} />
      <Box
        className="search-panel"
        sx={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box className="search-panel__filters" sx={{ marginBottom: '10px' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexGrow: 1,
                justifyContent: 'flex-start',
                marginBottom: '10px',
              }}
            >
              <SearchBox
                className="searchbox"
                searchAsYouType={false}
                autoFocus={true}
                translations={{ placeholder: 'Search title here...' }}
              />
            </Box>
            {userId !== undefined && (
              <>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ margin: '10px' }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    margin: '10px',
                    flexGrow: 1,
                    justifyContent: 'center',
                  }}
                >
                  <Typography>My roles: </Typography>
                  <ToggleRefinement
                    attribute="admin"
                    label="Admin"
                    value={userId}
                  />
                  <ToggleRefinement attribute="dms" label="DM" value={userId} />
                  <ToggleRefinement
                    attribute="players"
                    label="Player"
                    value={userId}
                  />
                </Box>
              </>
            )}
            <Divider orientation="vertical" flexItem sx={{ margin: '10px' }} />
            <Box
              sx={{
                display: 'flex',
                flexGrow: 1,
                justifyContent: 'flex-end',
                marginBottom: '10px',
              }}
            >
              <Typography sx={{ marginRight: '10px' }}>Sort by: </Typography>
              <SortBy
                items={[
                  { value: 'title_asc', label: 'Title asc.' },
                  { value: 'title_desc', label: 'Title desc.' },
                  { value: 'status_asc', label: 'Status asc.' },
                  { value: 'status_desc', label: 'Status desc.' },
                ]}
                defaultRefinement="title_asc"
              />
            </Box>
          </Box>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel-content"
              id="panel-header"
            >
              <Typography>More filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  marginBottom: '10px',
                }}
              >
                <Box sx={{ width: '50%' }}>
                  <Typography>Tags</Typography>
                  <RefinementList attribute="tags" />
                </Box>
                <Box sx={{ width: '50%' }}>
                  <Typography>Status</Typography>
                  <MenuSelect attribute="status" />
                </Box>
              </Box>
              <Box>
                <ClearRefinements />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
        <Box className="search-panel__pagination" sx={{ marginBottom: '10px' }}>
          <Pagination />
        </Box>
        <Box className="search-panel__hits" sx={{ marginBottom: '10px' }}>
          <CustomHits userId={userId} />
        </Box>
        <Box className="search-panel__pagination">
          <Pagination />
        </Box>
      </Box>
    </InstantSearch>
  );
}

export default RunsListing;
