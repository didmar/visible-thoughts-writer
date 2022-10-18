import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useParams } from 'react-router-dom';
import { useAuth } from '../components/Auth';
import Composer from '../components/composer/Composer';
import { ComposerMode } from '../components/composer/types';
import Navbar from '../components/Navbar';
import StepElem, { renderLongTermThoughts } from '../components/StepElem';
import { useWindowActivity } from '../components/WindowContextProvider';
import {
  addStep,
  Bullet,
  collectSectionLtts,
  createNextStep,
  getNextSectionForStep,
  getRun,
  getStepN,
  getUserRoleInRun,
  isDM,
  isOurTurnToWrite,
  isPlayer,
  mergeStepsWithUpdates,
  onStepsChanged,
  onUserProfileChanged,
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
  UserProfile,
} from '../firebase-app';
import { playDing, setWindowStatus, WindowStatus } from '../utils';
import NotFoundPage from './NotFoundPage';

// How many steps ago to give a hint of
const X = 50;

function RunPage(): JSX.Element {
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
  const [role, setRole] = useState<Role | null | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(
    undefined
  );

  const currentUser = useAuth();

  const windowIsActive = useWindowActivity();
  useEffect(() => {
    if (windowIsActive) {
      setWindowStatus(WindowStatus.WAITING);
    }
  }, [windowIsActive]);

  // Initialize run and steps
  useEffect(() => {
    console.log('RunPage > useEffect []');

    if (runId === undefined) {
      throw new Error('RunPage with no runId!');
    }

    void (async function () {
      // Init run
      const run = await getRun(runId);
      if (run === undefined) {
        console.error('Run not found');
        setRun(null);
      } else {
        setRun(run);
        setLtts(run.sortedLtts());
      }

      // Create listener for new steps and updates
      await onStepsChanged(runId, setUpdatedSteps);
      // Create listener for user profile change (for sound notifs)
      await onUserProfileChanged(runId, setUserProfile);
    })();
  }, []);

  // When user change, initialize the role
  useEffect(() => {
    console.log('RunPage > useEffect [currentUser]: ', currentUser);

    void (async function () {
      // Init role of user for this particular run
      const uid = currentUser?.uid();
      if (runId !== undefined && uid !== undefined) {
        const role = await getUserRoleInRun(uid, runId);
        setRole(role);
      } else {
        setRole(null); // Guest
      }
    })();
  }, [currentUser]);

  // When steps are updated
  useEffect(() => {
    console.log('RunPage > useEffect [updatedSteps]: ', updatedSteps);

    if (runId === undefined) {
      throw new Error('RunPage with no runId!');
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

    // Is there some changes that could mean it is user's turn to write?
    if (lastStepModified && currentUser !== undefined && currentUser !== null) {
      const lastStep = merged[merged.length - 1];
      if (isOurTurnToWrite(role, lastStep)) {
        void (async function () {
          // Should we sound the bell and change window title?
          if (
            role !== Role.Both &&
            !windowIsActive &&
            userProfile?.soundNotif === true
          ) {
            await playDing();
            setWindowStatus(WindowStatus.READY);
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
    console.log('RunPage > useEffect [steps]: ', steps);

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
      return <>Loading...</>;
    }
    if (role === null) {
      return <>Only designated users can participate</>;
    }

    const section = getNextSection();
    if (section === undefined) {
      return <>Wait...</>; // Waiting for the next step to be created
    }

    // Is it our time to write?
    if (section === Section.Act) {
      if (!isPlayer(role)) {
        return <>Wait for the player to write their part...</>;
      }
    } else if (!isDM(role)) {
      return <>Wait for the DM to write their part...</>;
    }

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

  const panePadding = 1;

  return run !== undefined && run !== null ? (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        height: '100vh',
        overflow: 'auto',
      }}
    >
      <Navbar run={run} />
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Grid container spacing={3}>
          {/* Steps */}
          <Grid item xs={12} md={isDM(role) ? 8 : 12} lg={isDM(role) ? 9 : 12}>
            <Paper
              sx={{
                p: panePadding,
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
                  p: panePadding,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '60vh',
                }}
              >
                <Typography variant="h6">Long-term thoughts</Typography>
                <Box sx={{ overflow: 'auto' }}>
                  {renderLongTermThoughts(ltts)}
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Compose */}
          <Grid item xs={12} md={isDM(role) ? 8 : 12} lg={isDM(role) ? 9 : 12}>
            <Paper
              sx={{
                p: panePadding,
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
                  p: panePadding,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '25vh',
                }}
              >
                <Typography variant="h6">{`${X} steps ago...`}</Typography>
                <Box sx={{ overflow: 'auto' }}>
                  {xStepAgo !== undefined && (
                    <StepElem step={xStepAgo} role={role} title={''} />
                  )}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  ) : run === undefined ? (
    <>Loading...</>
  ) : (
    <NotFoundPage />
  );
}

export default RunPage;
