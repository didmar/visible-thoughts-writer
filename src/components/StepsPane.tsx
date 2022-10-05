import {
  AppBar,
  Box,
  Container,
  Grid,
  IconButton,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Menu,
  // Settings,
  // AccountCircle,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import {
  Step,
  getStepN,
  Thought,
  Bullet,
  getNextSectionForStep,
  Section,
  addStep,
  TextYBR,
  SectionContent,
  updateStep,
  createNextStep,
  getRun,
  updateRunLongTermThoughtsForStep,
  collectSectionLtts,
  Run,
  getUserRoleInRun,
  Role,
  onStepsChanged,
  mergeStepsWithUpdates,
} from '../firebase-app';
import StepElem, { renderLongTermThoughts } from './StepElem';
import Composer from './Composer';
import HelpAndFeedback from './HelpAndFeedback';
import UserMenu from './UserMenu';
import PageNotFound from './PageNotFound';
import { useAuth } from './Auth';

// How many steps ago to give a hint of
const X = 50;

function StepsPane(): JSX.Element {
  const { runId } = useParams<string>();

  const [run, setRun] = useState<Run | null | undefined>(undefined);

  const [steps, setSteps] = useState<Step[] | undefined>(undefined);
  const [updatedSteps, setUpdatedSteps] = useState<Step[] | undefined>(
    undefined
  );

  const [xStepAgo, setXStepAgo] = useState<Step | undefined>(undefined);
  const [ltts, setLtts] = useState<Thought[]>([]);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [role, setRole] = useState<Role | null | undefined>(undefined);

  const currentUser = useAuth();

  // Initialize run and steps
  useEffect(() => {
    console.log('StepsPane > useEffect []');

    if (runId === undefined) {
      throw new Error('StepsPane with no runId!');
    }

    void (async function () {
      // Init run
      const run = await getRun(runId);
      if (run === undefined) {
        console.log('Run not found');
        setRun(null);
      } else {
        setRun(run);
      }

      // Create listener for new steps and updates
      await onStepsChanged(runId, setUpdatedSteps);
    })();
  }, []);

  // When user change, initialize the role
  useEffect(() => {
    console.log('StepsPane > useEffect [currentUser]: ', currentUser);

    void (async function () {
      // Init role of user for this particular run
      const uid = currentUser?.uid();
      if (runId !== undefined && uid !== undefined) {
        const role = await getUserRoleInRun(uid, runId);
        setRole(role);
        console.log('User has role: ', role);
      } else {
        setRole(null); // Guest
      }
    })();
  }, [currentUser]);

  // When steps are updated
  useEffect(() => {
    console.log('StepsPane > useEffect [updatedSteps]: ', updatedSteps);

    if (updatedSteps === undefined || updatedSteps.length === 0) return;

    // When using React.StrictMode, will be called with 3 steps
    // that have undefined attributes!
    if (updatedSteps[0].n === undefined) return;

    const _steps = mergeStepsWithUpdates(steps, updatedSteps);
    setSteps(_steps);
  }, [updatedSteps]);

  // When steps change
  useEffect(() => {
    console.log('StepsPane > useEffect [steps]: ', steps);

    if (runId === undefined) return;
    if (steps === undefined) return;

    void (async function () {
      const section = getNextSection();
      // Did we reach the end of the step?
      // Create the next step if we are the DM
      if (section === undefined && role === Role.DM) {
        const currentStep =
          steps.length !== 0 ? steps[steps.length - 1] : undefined;
        const newStep = createNextStep(currentStep);
        await addStep(runId, newStep);
      } else {
        // Note: the else clause is to optimize the number of calls to Firestore.
        // If we add a new step, we will came back here anyways!

        // Init step from x steps ago, if needed
        const lastN = steps[steps.length - 1].n;
        const nMinusX = Math.max(lastN - X, 1);
        if (xStepAgo === undefined || xStepAgo.n !== nMinusX) {
          const _xStepAgo = await getStepN(runId, nMinusX);
          if (_xStepAgo !== undefined) {
            setXStepAgo(_xStepAgo);
          }
        }

        // Init long term thoughts and run title
        const run = await getRun(runId);
        if (run !== undefined) {
          setTitle(run.title);
          setLtts(run.lttsToArray());
        } else {
          throw new Error(`Run ${runId} not found!`);
        }
      }
    })();
  }, [steps]);

  const onSubmitted = (section: Section, content: SectionContent): void => {
    if (runId === undefined) {
      throw new Error('onSubmitted called before runId was initialized!');
    }
    if (steps === undefined || steps.length === 0) {
      throw new Error('onSubmitted called before steps were initialized!');
    }

    const lastStep = steps[steps.length - 1];

    let update;
    let lttsUpdate: Thought[] = [];
    switch (section) {
      case Section.InitT:
        update = { initT: content as Bullet[] | null };
        lttsUpdate = collectSectionLtts(content as Bullet[] | null);
        break;
      case Section.Ppt:
        update = { ppt: content as string | null };
        break;
      case Section.PpptT:
        update = { ppptT: content as Bullet[] | null };
        lttsUpdate = collectSectionLtts(content as Bullet[] | null);
        break;
      case Section.Act:
        update = { act: content as TextYBR | null };
        break;
      case Section.PactT:
        update = { pactT: content as Bullet[] | null };
        lttsUpdate = collectSectionLtts(content as Bullet[] | null);
        break;
      case Section.Out:
        update = { out: content as TextYBR | null };
        break;
      default:
        throw new Error(`Unknown section: ${Section[section]}`);
    }

    // Update in Firebase (will trigger onStepsChanged
    // and update the UI indirectly)
    void (async () => {
      await updateStep(runId, lastStep.n, update);
      if (lttsUpdate.length !== 0) {
        await updateRunLongTermThoughtsForStep(runId, lastStep.n);
      }
    })();
  };

  function getNextSection(): Section | undefined {
    if (steps === undefined || steps.length === 0) return undefined;
    const section = getNextSectionForStep(steps[steps.length - 1]);
    return section;
  }

  function renderComposer(): JSX.Element {
    if (role === undefined) {
      return <>Loading...</>;
    }
    if (role !== Role.Player && role !== Role.DM) {
      return <>Only designated players can participate</>;
    }

    const section = getNextSection();
    if (section === undefined) {
      return <>Wait...</>; // Waiting for the next step to be created
    }

    // Is it our time to write?
    if (section === Section.Act) {
      if (role !== Role.Player) {
        return <>Wait for the player to write their part...</>;
      }
    } else if (role !== Role.DM) {
      return <>Wait for the DM to write their part...</>;
    }

    return <Composer section={section} onSubmitted={onSubmitted} />;
  }

  async function loadMoreSteps(): Promise<void> {
    if (runId === undefined || steps === undefined || steps.length === 0)
      return;
    console.log('Loading more...');
    // Get the previous step
    const firstStepAlreadyLoaded = steps[0];
    const previousN = firstStepAlreadyLoaded.n - 1;
    if (previousN === 0) return; // No previous step to load
    const previousStep = await getStepN(runId, previousN);
    if (previousStep === undefined) {
      throw new Error('Could not load previous step');
    }
    setSteps([previousStep, ...steps]);
  }

  return run !== undefined && run !== null ? (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        height: '100vh',
        overflow: 'auto',
      }}
    >
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <Link to="/">
              <Menu />
            </Link>
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title !== undefined ? title : ''}
          </Typography>

          <HelpAndFeedback />
          <UserMenu />

          {/*
          <IconButton size="large" aria-label="search" color="inherit">
            <Settings />
          </IconButton>

           */}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Grid container spacing={3}>
          {/* Steps */}
          <Grid
            item
            xs={12}
            md={role === Role.DM ? 8 : 12}
            lg={role === Role.DM ? 9 : 12}
          >
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column-reverse',
                height: '70vh',
                overflow: 'auto',
              }}
              id="scrollableDiv"
            >
              <InfiniteScroll
                dataLength={steps !== undefined ? steps.length : 0}
                next={() => {
                  void (async function () {
                    await loadMoreSteps();
                  })();
                }}
                hasMore={
                  steps !== undefined && steps.length !== 0
                    ? steps[0].n > 1
                    : false
                }
                loader={<h4>Loading...</h4>}
                inverse={true}
                style={{ display: 'flex', flexDirection: 'column-reverse' }}
                scrollableTarget="scrollableDiv"
              >
                {steps
                  ?.slice()
                  .reverse()
                  .map((step) => (
                    <StepElem
                      key={step.n}
                      step={step}
                      isDM={role === Role.DM}
                    />
                  ))}
              </InfiniteScroll>
            </Paper>
          </Grid>

          {/* Long-term thoughts */}
          {role === Role.DM && (
            <Grid
              item
              xs={0}
              md={4}
              lg={3}
              display={{ xs: 'none', md: 'block', lg: 'block' }}
            >
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '70vh',
                  overflow: 'auto',
                }}
              >
                <h4> Long-term thoughts</h4>
                {renderLongTermThoughts(ltts)}
              </Paper>
            </Grid>
          )}

          {/* Compose */}
          <Grid item xs={12} md={8} lg={9}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: '15vh',
                overflow: 'auto',
              }}
            >
              {renderComposer()}
            </Paper>
          </Grid>

          {/* X steps ago */}
          <Grid
            item
            xs={0}
            md={4}
            lg={3}
            display={{ xs: 'none', md: 'block', lg: 'block' }}
          >
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: '15vh',
                overflow: 'auto',
              }}
            >
              {xStepAgo !== undefined && (
                <StepElem step={xStepAgo} isDM={role === Role.DM} />
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  ) : run === undefined ? (
    <>Loading...</>
  ) : (
    <PageNotFound />
  );
}

export default StepsPane;
