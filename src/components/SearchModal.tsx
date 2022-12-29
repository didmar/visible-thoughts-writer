import {
  MultipleQueriesOptions,
  MultipleQueriesQuery,
} from '@algolia/client-search';
import { RequestOptions } from '@algolia/transporter';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NavigationIcon from '@mui/icons-material/Navigation';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Fab,
  IconButton,
  List,
  ListItem,
  Modal,
  Typography,
} from '@mui/material';
import algoliasearch from 'algoliasearch/lite';
import { useEffect, useState } from 'react';
import {
  HighlightProps,
  Hit,
  InfiniteHitsProvided,
} from 'react-instantsearch-core';
import {
  Configure,
  connectHighlight,
  connectInfiniteHits,
  InstantSearch,
  SearchBox,
} from 'react-instantsearch-dom';
import { useNavigate } from 'react-router-dom';

import conf from '../conf.json';

const baseSearchClient =
  conf !== undefined
    ? algoliasearch(conf.algoliaAppId, conf.algoliaAPIKey)
    : undefined;

// Global position the fab (button) element
const fabTop = 150;
const fabLeft = 10;

// Style for the modal element
const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '100%',
  height: '100%',
  maxWidth: '800px',
  minWidth: '270px',
  zIndex: 100,
  // media query to avoid cutoff on smaller viewports
  '@media(max-height: 890px)': {
    top: '0',
    transform: 'translate(-50%, 0%)',
  },
};

// Format of a document in the Algolia index (excluding objectID)
interface Doc {
  runId: string;
  n: number;
  initT: string[];
  ppt: string;
  ppptT: string[];
  act: string;
  pactT: string[];
  out: string;
}

const Highlight = ({
  highlight,
  attribute,
  hit,
}: HighlightProps<Doc>): JSX.Element => {
  // Parse the hit to get the highlighted part
  // Will either be an array of {value, isHighlighted} objects,
  // or a nested array of these for thought sections.
  // Since the highlight prop is typed only for the former,
  // we need to do some forced casting to manipulate it.
  const parsedHit = highlight({
    highlightProperty: '_highlightResult',
    attribute,
    hit,
  }) as unknown[];

  if (parsedHit.length === 0) return <></>;

  // Thought sections will have multiple "parts" (each thought),
  // that we want to render as separate <li> elements.
  const parsedHitParts = (
    parsedHit[0] instanceof Array ? parsedHit : [parsedHit]
  ) as Array<Array<{ value: string; isHighlighted: boolean }>>;

  const elems = parsedHitParts.map((part, idx) => {
    if (
      part.length === 0 ||
      part.filter((segment) => segment.isHighlighted).length === 0
    )
      return <></>;
    return (
      <li key={`${attribute}-${idx}`}>
        <span>
          {part.map((segment, segidx) =>
            segment.isHighlighted ? (
              <mark key={segidx}>{segment.value}</mark>
            ) : (
              <span key={segidx}>{segment.value}</span>
            )
          )}
        </span>
      </li>
    );
  });
  return <>{elems}</>;
};

const CustomHighlight = connectHighlight(Highlight);

interface Props {
  runId: string;
  visibleThoughts: boolean;
}

function SearchModal({ runId, visibleThoughts }: Props): JSX.Element {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [startedSearch, setStartedSearch] = useState(false);
  const handleOpen = (): void => {
    setOpen(true);
    setStartedSearch(false);
  };
  const handleClose = (): void => setOpen(false);

  useEffect(() => {
    console.log('SearchModal > useEffect []');
  }, []);

  const attributesToSearch = visibleThoughts
    ? ['initT', 'ppt', 'ppptT', 'act', 'pactT', 'out']
    : ['ppt', 'act', 'out'];

  const customSearchClient =
    baseSearchClient === undefined
      ? undefined
      : {
          search(
            requests: readonly MultipleQueriesQuery[],
            requestOptions:
              | (RequestOptions & MultipleQueriesOptions)
              | undefined
          ) {
            console.debug('search requests: ', requests);

            const processedRequests = requests.flatMap((request) => {
              // Only kept the requests that have a non-empty query,
              // in order to avoid an initial querying before user input.
              if (request.params === undefined) return [];
              if (request.params.query === '') return [];
              return [request];
            });

            if (processedRequests.length === 0) {
              return;
            }
            const results = baseSearchClient.search(
              processedRequests,
              requestOptions
            );
            setStartedSearch(true);
            return results;
          },
        };

  const HitElem = ({ hit }: { hit: Hit<Doc> }): JSX.Element => (
    <ul>
      {attributesToSearch.map((attribute, index) => (
        <Box key={index}>
          <CustomHighlight hit={hit} attribute={attribute} />
        </Box>
      ))}
    </ul>
  );

  const MyInfiniteHits = ({
    hits,
    hasMore,
    refineNext,
  }: InfiniteHitsProvided<Hit<Doc>>): JSX.Element => {
    return hits.length === 0 ? (
      <Box
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 24,
          boxRadius: 3,
          p: 1,
        }}
      >
        <Typography>No results</Typography>
      </Box>
    ) : (
      <>
        <List>
          {hits.map((hit, index) => (
            <ListItem
              key={index}
              alignItems="flex-start"
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 24,
                borderRadius: 3,
                mb: 1,
                flexDirection: 'column',
              }}
            >
              <Button
                variant="outlined"
                startIcon={<NavigationIcon />}
                onClick={() => {
                  navigate({ search: `?n=${hit.n}` });
                  setOpen(false);
                }}
              >
                Step {hit.n}
              </Button>
              <HitElem hit={hit} />
            </ListItem>
          ))}
        </List>
        {hasMore && (
          <Button
            variant="outlined"
            size="large"
            style={{ width: '100%', backgroundColor: 'white' }}
            onClick={refineNext}
            disabled={!hasMore}
          >
            Show more
          </Button>
        )}
      </>
    );
  };

  const CustomInfiniteHits = connectInfiniteHits(MyInfiniteHits);

  return (
    <div>
      <Fab
        size="medium"
        color="primary"
        style={{
          position: 'fixed',
          top: fabTop,
          left: fabLeft,
        }}
        aria-label="search"
        onClick={handleOpen}
      >
        <SearchIcon />
      </Fab>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="search-modal-title"
        aria-describedby="search-modal-description"
        disableScrollLock={false}
        sx={{ overflow: 'scroll' }}
      >
        <Box sx={style}>
          {customSearchClient !== undefined ? (
            <InstantSearch
              searchClient={customSearchClient}
              indexName="prod_steps"
            >
              {/* Keep the search box part visible on top of the results */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  mb: 1,
                  bgcolor: 'background.paper',
                  boxShadow: 24,
                }}
              >
                <Box>
                  <IconButton onClick={handleClose}>
                    <ArrowBackIcon />
                  </IconButton>
                </Box>
                <Box
                  sx={{
                    alignSelf: 'center',
                  }}
                >
                  <SearchBox searchAsYouType={false} autoFocus={true} />
                </Box>
              </Box>

              <Configure
                restrictSearchableAttributes={attributesToSearch}
                facetFilters={[[`runId:${runId}`]]}
                facets={['runId']}
                hitsPerPage={10}
              />

              {/* Start showing the results list once we have actually
                  looked something up */}
              {startedSearch && <CustomInfiniteHits />}
            </InstantSearch>
          ) : (
            <Typography>Search not available!</Typography>
          )}
        </Box>
      </Modal>
    </div>
  );
}

export default SearchModal;
