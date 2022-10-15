import { Menu } from '@mui/icons-material';
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
import { useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Link, useParams } from 'react-router-dom';
import {
  addStep,
  Bullet,
  collectSectionLtts,
  createNextStep,
  getNextSectionForStep,
  getRun,
  getStepN,
  getUserRoleInRun,
  mergeStepsWithUpdates,
  onStepsChanged,
  Role,
  Run,
  Section,
  SectionContent,
  Step,
  TextYBR,
  Thought,
  UpdatedSteps,
  updateRunLongTermThoughtsForStep,
  updateStep,
  updateUserRunState,
  isDM,
  isPlayer,
  shouldBeNotified,
} from '../firebase-app';
import { playDing, setWindowStatus, WindowStatus } from '../utils';
import { useAuth } from './Auth';
import Composer from './composer/Composer';
import { ComposerMode } from './composer/types';
import HelpAndFeedback from './HelpAndFeedback';
import PageNotFound from './PageNotFound';
import RunSettingsModal from './RunSettingsModal';
import StepElem, { renderLongTermThoughts } from './StepElem';
import UserMenu from './UserMenu';

// How many steps ago to give a hint of
const X = 50;

function StepsPane(): JSX.Element {
  const { runId } = useParams<string>();

  // State for the initial value of the run.
  // Will not be updated after the initial load, but we will update
  // the ltts via a separate ltts state.
  const [run, setRun] = useState<Run | null | undefined>(undefined);

  const [steps, setSteps] = useState<Step[] | undefined>(undefined);
  const [updatedSteps, setUpdatedSteps] = useState<UpdatedSteps | undefined>(
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
        console.log('*** Init run, title and ltts');
        setRun(run);
        setTitle(run.title);
        setLtts(run.sortedLtts());
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

    if (runId === undefined) {
      throw new Error('StepsPane with no runId!');
    }

    if (updatedSteps === undefined) return;

    // When using React.StrictMode, will be called with 3 steps
    // that have undefined attributes!
    if (updatedSteps.added.length > 0 && updatedSteps.added[0].n === undefined)
      return;

    const { merged, lastStepModified } = mergeStepsWithUpdates(
      steps,
      updatedSteps
    );

    // Should will ring the notification bell?
    if (lastStepModified && currentUser !== undefined && currentUser !== null) {
      const lastStep = merged[merged.length - 1];
      const nextSection = getNextSectionForStep(lastStep);
      if (shouldBeNotified(role, nextSection)) {
        void (async function () {
          // Sound the bell, except if the user is both DM and player
          if (role !== Role.Both) {
            await playDing();
          }
          // Update the user's run state, to indicate that the user has been
          // notified of their cue on this step, and that there is not need to
          // sent a notification by email.
          await updateUserRunState(currentUser.uid(), runId, role, lastStep.n);
        })();
      }
    }

    setSteps(merged);
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
      if (section === undefined && isDM(role)) {
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

        // FIXME: this is not efficient, we should only get it once,
        // and then update the ltts without a round-trip to Firestore.
        const updatedRun = await getRun(runId);
        if (updatedRun !== undefined) {
          setTitle(updatedRun.title);
          setLtts(updatedRun.sortedLtts());
        } else {
          throw new Error(`Run ${runId} not found!`);
        }
      }
    })();
  }, [steps]);

  const onSubmitted = (
    n: number,
    section: Section,
    content: SectionContent
  ): void => {
    if (runId === undefined) {
      throw new Error('onSubmitted called before runId was initialized!');
    }
    if (steps === undefined || steps.length === 0) {
      throw new Error('onSubmitted called before steps were initialized!');
    }

    // Get the step that we modified
    const step = steps.find((s) => s.n === n);
    if (step === undefined) {
      throw new Error(
        `Got an update for step ${n}, but we have not loaded it yet!`
      );
    }

    let update;
    let lttsUpdate: Thought[] = [];
    switch (section) {
      case Section.InitT: {
        const initT = content !== null ? (content.value as Bullet[]) : null;
        update = { initT };
        lttsUpdate = [initT, step.ppptT ?? null, step.pactT ?? null].flatMap(
          collectSectionLtts
        );
        break;
      }
      case Section.Ppt: {
        const ppt = content !== null ? (content.value as string) : null;
        update = { ppt };
        break;
      }
      case Section.PpptT: {
        const ppptT = content !== null ? (content.value as Bullet[]) : null;
        update = { ppptT };
        lttsUpdate = [step.initT ?? null, ppptT, step.pactT ?? null].flatMap(
          collectSectionLtts
        );
        break;
      }
      case Section.Act: {
        const act = content !== null ? (content.value as TextYBR) : null;
        update = { act };
        break;
      }
      case Section.PactT: {
        const pactT = content !== null ? (content.value as Bullet[]) : null;
        update = { pactT };
        lttsUpdate = [step.initT ?? null, step.ppptT ?? null, pactT].flatMap(
          collectSectionLtts
        );
        break;
      }
      case Section.Out: {
        const out = content !== null ? (content.value as TextYBR) : null;
        update = { out };
        break;
      }
      default:
        throw new Error(`Unknown section: ${Section[section]}`);
    }

    // Update in Firestore, that will trigger onStepsChanged
    // and update the UI indirectly
    void (async () => {
      // Update ltts BEFORE updating the step, because the step update
      // will trigger a call to onStepsChanged, which will refetch
      // the ltts from the run document and update the UI.
      if (lttsUpdate.length !== 0) {
        await updateRunLongTermThoughtsForStep(runId, n, lttsUpdate);
      }

      await updateStep(runId, n, update);
    })();
  };

  function getNextSection(): Section | undefined {
    if (steps === undefined || steps.length === 0) return undefined;
    const section = getNextSectionForStep(steps[steps.length - 1]);
    return section;
  }

  function renderComposer(): JSX.Element {
    if (role === undefined || steps === undefined || steps.length === 0) {
      setWindowStatus(WindowStatus.WAITING);
      return <>Loading...</>;
    }
    if (role === null) {
      setWindowStatus(WindowStatus.WAITING);
      return <>Only designated users can participate</>;
    }

    const section = getNextSection();
    if (section === undefined) {
      setWindowStatus(WindowStatus.WAITING);
      return <>Wait...</>; // Waiting for the next step to be created
    }

    // Is it our time to write?
    if (section === Section.Act) {
      if (!isPlayer(role)) {
        setWindowStatus(WindowStatus.WAITING);
        return <>Wait for the player to write their part...</>;
      }
    } else if (!isDM(role)) {
      setWindowStatus(WindowStatus.WAITING);
      return <>Wait for the DM to write their part...</>;
    }

    setWindowStatus(WindowStatus.READY);
    return (
      <Composer
        initMode={ComposerMode.CREATE}
        n={steps[steps.length - 1].n}
        section={section}
        onSubmitted={onSubmitted}
      />
    );
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
          {isDM(role) && <RunSettingsModal run={run} />}
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
          <Grid item xs={12} md={isDM(role) ? 8 : 12} lg={isDM(role) ? 9 : 12}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column-reverse',
                height: '60vh',
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
                      role={role}
                      onSubmitted={onSubmitted}
                    />
                  ))}
              </InfiniteScroll>
            </Paper>
          </Grid>

          {/* Long-term thoughts */}
          {isDM(role) && (
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
          <Grid item xs={12} md={isDM(role) ? 8 : 12} lg={isDM(role) ? 9 : 12}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: '25vh',
                overflow: 'auto',
              }}
            >
              {renderComposer()}
            </Paper>
          </Grid>

          {/* X steps ago */}
          {isDM(role) && (
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
                  <StepElem
                    step={xStepAgo}
                    role={role}
                    title={`${X} steps ago...`}
                  />
                )}
              </Paper>
            </Grid>
          )}
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
