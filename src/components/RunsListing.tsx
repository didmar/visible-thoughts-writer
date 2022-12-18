import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NavigationIcon from '@mui/icons-material/Navigation';
import PersonIcon from '@mui/icons-material/Person';
import {
  Box,
  Chip,
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
import { useNavigate } from 'react-router-dom';
import TagsInput from 'react-tagsinput';

import conf from '../conf.json';
import { RunStatus, runStatusTooltip } from '../firebase-app';
import '../styles.css';
import { noop } from '../utils';

const searchClient = algoliasearch(conf.algoliaAppId, conf.algoliaAPIKeyRuns);

// Format of a document in the Algolia index (excluding objectID)
interface Doc {
  objectID: string;
  title: string;
  dm: string;
  players: string[];
  status: RunStatus;
  tags: string[];
}

const isUserAParticipant = (hit: Doc, userId: string): boolean => {
  return hit.dm === userId || hit.players.includes(userId);
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

const CustomHits = connectHits<
  { hits: Array<Hit<Doc>>; userId: string | undefined },
  Doc
>(({ hits, userId }) => {
  const navigate = useNavigate();
  return (
    <TableContainer component={Paper}>
      <Table aria-label="table">
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell>Title</TableCell>
            {/* <TableCell>DM</TableCell>
            <TableCell>Steps</TableCell> */}
            <TableCell>Status</TableCell>
            <TableCell>Tags</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {hits.map((hit: Doc) => (
            <TableRow
              key={hit.objectID}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell>
                <Tooltip title={'Go to this run'}>
                  <Fab
                    size="small"
                    color="primary"
                    aria-label="go to run"
                    onClick={() => {
                      navigate(`/runs/${hit.objectID}`);
                    }}
                  >
                    <NavigationIcon />
                  </Fab>
                </Tooltip>
              </TableCell>
              <TableCell style={{ padding: 0 }}>
                {userId !== undefined && isUserAParticipant(hit, userId) && (
                  <Tooltip title={'You are a participant'}>
                    <PersonIcon />
                  </Tooltip>
                )}
              </TableCell>

              <TableCell
                component="th"
                scope="row"
                style={{ maxWidth: '500px' }}
              >
                {hit.title}
              </TableCell>
              {/* <TableCell>{hit.dm}</TableCell>
              <TableCell align="right">42</TableCell> */}
              <TableCell>{createStatusChip(hit.status)}</TableCell>
              <TableCell>
                {/* Reuse TagsInput to display the tags, disabling the input */}
                {hit.tags !== undefined && (
                  <TagsInput
                    className="react-tagsinput--view"
                    value={hit.tags}
                    disabled={true}
                    onChange={noop}
                    renderLayout={(tagComponents, _) => (
                      <span>{tagComponents}</span>
                    )}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
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
      <Configure hitsPerPage={5} filters={'deleted:false'} />
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
                  <Typography>My role: </Typography>
                  <ToggleRefinement attribute="dm" label="DM" value={userId} />
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
