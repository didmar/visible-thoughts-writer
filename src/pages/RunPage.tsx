import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css'; // Required for Allotment to work
import { useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../components/Auth';
import Composer from '../components/composer/Composer';
import { ComposerMode } from '../components/composer/types';
import { SectionContent } from '../components/composer/utils';
import GoToModal from '../components/GoToModal';
import Navbar from '../components/Navbar';
import RunSettingsModal from '../components/RunSettingsModal';
import SearchModal from '../components/SearchModal';
import StepElem, { renderLongTermThoughts } from '../components/StepElem';
import { useWindowActivity } from '../components/WindowContextProvider';
import conf from '../conf.json';
import {
  addStep,
  Bullet,
  collectSectionLtts,
  createNextStep,
  defaultThoughts,
  getLastNSteps,
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
  Step,
  TextYBR,
  Thought,
  UpdatedSteps,
  updateRunLongTermThoughtsForStep,
  updateStep,
  updateUserRunState,
  UserProfile,
} from '../firebase-app';
import {
  noop,
  playDing,
  setWindowStatus,
  WindowStatus,
  zipWithPrev,
} from '../utils';
import NotFoundPage from './NotFoundPage';

// How many steps ago to give a hint of
const X = 50;

function RunPage(): JSX.Element {
  const { runId } = useParams<string>();

  // State for the initial value of the run.
  // Will not be updated after the initial load, but we will update
  // the ltts via a separate ltts state.
  const [run, setRun] = useState<Run | null | undefined>(undefined);

  const location = useLocation();
  const getQueryN = (): number | null => {
    const _nStr = new URLSearchParams(location.search).get('n');
    if (_nStr === null) return null;
    const _n = parseInt(_nStr, 10);
    if (isNaN(_n) || _n <= 0) return null;
    return _n;
  };
  const queryN = getQueryN();

  const [steps, setSteps] = useState<Step[] | undefined>(undefined);
  const [updatedSteps, setUpdatedSteps] = useState<UpdatedSteps | undefined>(
    undefined
  );
  // Ref to the unsubscribe function, to stop listening for steps changes
  let stepsChangedUnsub = noop;
  // const [monitorFromStepN, setMonitorFromStepN] = useState<number | undefined>(
  //   undefined
  // );

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

      // Update listener for new steps and updates
      await updateStepsListener(runId);

      // // The listener will not fire for the first N - 1 steps, so we need to
      // // fetch them manually if they get edited!
      // setMonitorFromStepN(n);

      // Create listener for user profile change (for sound notifs)
      await onUserProfileChanged(runId, setUserProfile);
    })();
  }, []);

  // React to change in step query param (?n=)
  useEffect(() => {
    console.log('RunPage > useEffect [queryN]: ', queryN);

    // If run is not defined yet, the main useEffect will take
    // care of subscribing to step changes for us.
    if (run === null || run === undefined) {
      return;
    }

    // Update listener for new steps and updates
    void (async function () {
      await updateStepsListener(run.id);
    })();
  }, [queryN]);

  const updateStepsListener = async (runId: string): Promise<void> => {
    // First unsubscribe from any previous listener
    stepsChangedUnsub();
    // Clear any previous steps
    setSteps(undefined);

    // If queryN is not defined, we want to load the last few steps
    // and listen to changes steps from that point
    if (queryN === null) {
      stepsChangedUnsub = await onStepsChanged(runId, setUpdatedSteps);
    } else {
      // But if a specific step queryN is defined, we want to load
      // a few steps before that point, and not listen to any changes.
      const _steps = await getLastNSteps(runId, queryN, conf.nbStepsToLoad);
      if (_steps.length > 0) {
        // Manually set updateSteps (which is normally done by the listener)
        setUpdatedSteps({ added: _steps, modified: [] });
      }
      stepsChangedUnsub = noop;
    }
  };

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
      // and we are not querying a specific step
      if (section === undefined && isDM(role) && queryN === null) {
        const currentStep =
          steps.length !== 0 ? steps[steps.length - 1] : undefined;
        const newStep = createNextStep(currentStep);
        await addStep(runId, newStep);
      } else {
        // Note: the else clause is to optimize the number of calls to Firestore.
        // If we add a new step, we will came back here anyways!

        // Init step from x steps ago, if needed
        if (steps.length > 0) {
          const lastN = steps[steps.length - 1].n;
          const nMinusX = Math.max(lastN - X, 1);
          if (xStepAgo === undefined || xStepAgo.n !== nMinusX) {
            const _xStepAgo = await getStepN(runId, nMinusX);
            if (_xStepAgo !== undefined) {
              setXStepAgo(_xStepAgo);
            }
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
    content: SectionContent,
    section: Section
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

    let update: Partial<Step> = {};
    let nextStep: Step | undefined;
    let updateNext: Partial<Step> = {};
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
        // If the user has just removed the YBR tag,
        // this will have an impact on the outcome and the next initial thoughts!
        if (step.act?.ybr === true && act?.ybr === false) {
          if (step.out === null) {
            update = { ...update, out: { txt: 'EDIT ME!', ybr: false } };
          }
          // Get the next step from the local state, or load it from Firestore
          nextStep = steps.find((s) => s.n === n + 1);
          if (nextStep === undefined) {
            void (async function () {
              nextStep = await getStepN(runId, n + 1);
            })();
          }
          if (nextStep?.initT !== undefined) {
            // Prepare the update
            updateNext = { initT: defaultThoughts };
            (updateNext.initT as Bullet[])[0].T[0].txt = 'EDIT ME!';
          }
        }
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
        let out = content !== null ? (content.value as TextYBR) : null;
        // Outcome may be left empty if the action had the <yo be real> tag,
        // in which case it should be considered skipped.
        if (out !== null && out.txt.length === 0) {
          if (step.act?.ybr ?? false) {
            out = null;
          } else {
            throw new Error(
              'Outcome is empty, but action does not have the <yo be real> tag!'
            );
          }
        }

        update = { out };

        // If the user has just added the YBR tag, or removed it,
        // this will have an impact on the next step's initial thoughts, prompt and post-prompt thoughts!
        const ybrAdded = step.out?.ybr === false && out?.ybr === true;
        const ybrRemoved = step.out?.ybr === true && out?.ybr === false;
        if (ybrAdded || ybrRemoved) {
          // Get the next step from the local state, or load it from Firestore
          nextStep = steps.find((s) => s.n === n + 1);
          if (nextStep === undefined) {
            void (async function () {
              nextStep = await getStepN(runId, n + 1);
            })();
          }
          if (nextStep !== undefined) {
            // Prepare the update
            if (ybrAdded) {
              updateNext = { initT: null, ppt: null, ppptT: null };
            } else {
              updateNext = {
                initT: defaultThoughts,
                ppt: 'EDIT ME!',
                ppptT: defaultThoughts,
              };
              (updateNext.initT as Bullet[])[0].T[0].txt = 'EDIT ME!';
              (updateNext.ppptT as Bullet[])[0].T[0].txt = 'EDIT ME!';
            }
          }
        }
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

      // const newUpdatedSteps: UpdatedSteps = { added: [], modified: [] };
      // If the listener won't get the updated step for us
      // if (monitorFromStepN !== undefined && n < monitorFromStepN) {
      //   console.log('!!! Update local state');
      //   const updatedStep = { ...step, ...update };
      //   newUpdatedSteps.modified.push(updatedStep);
      // }

      if (nextStep !== undefined && Object.keys(updateNext).length !== 0) {
        // Update the next step
        await updateStep(runId, n + 1, updateNext);
        // If the listener won't get the updated step for us
        // if (monitorFromStepN !== undefined && n + 1 < monitorFromStepN) {
        //   // Then add it the local state ourselves to trigger a re-render
        //   const updatedNextStep: Step = { ...nextStep, ...updateNext };
        //   console.log('!!! Update local state (next step)');
        //   newUpdatedSteps.modified.push(updatedNextStep);
        // }
      }

      // if (newUpdatedSteps.modified.length > 0) {
      //   setUpdatedSteps(newUpdatedSteps);
      // }
    })();
  };

  // function updateSteps(updatedStep: Step): void {
  //   // Insert or update step in the local state steps
  //   if (steps === undefined) {
  //     setSteps([updatedStep]);
  //     return;
  //   }
  //   const idx = steps.findIndex((s) => s.n === updatedStep.n);
  //   steps[idx] = updatedStep;
  //   setSteps(steps);
  // }

  function getNextSection(): Section | undefined {
    if (steps === undefined || steps.length === 0) return undefined;
    const section = getNextSectionForStep(steps[steps.length - 1]);
    return section;
  }

  function renderComposer(): JSX.Element {
    if (role === undefined || steps === undefined || steps.length === 0) {
      return <CircularProgress />;
    }
    if (role === null) {
      return <>Only designated users can participate</>;
    }

    const section = getNextSection();
    if (section === undefined) {
      return <CircularProgress />; // Waiting for the next step to be created
    }

    // Is it our time to write?
    if (section === Section.Act) {
      if (!isPlayer(role)) {
        return <>Wait for the player to write their part...</>;
      }
    } else if (!isDM(role)) {
      return <>Wait for the DM to write their part...</>;
    }

    const step = steps[steps.length - 1];
    return (
      <Composer
        initMode={ComposerMode.CREATE}
        n={step.n}
        section={section}
        onSubmitted={onSubmitted}
        actionHasYBRTag={step.act?.ybr ?? false}
      />
    );
  }

  async function loadMoreSteps(): Promise<void> {
    if (runId === undefined || steps === undefined || steps.length === 0)
      return;

    console.debug('Loading more...');

    // Get the conf.nbStepsToLoad previous steps
    const previousSteps: Step[] = [];
    for (
      let n = steps[0].n - 1;
      n >= steps[0].n - conf.nbStepsToLoad && n > 0;
      n--
    ) {
      const step = await getStepN(runId, n);
      if (step === undefined) {
        throw new Error('Could not load previous step');
      }
      previousSteps.push(step);
    }
    previousSteps.reverse();

    setSteps([...previousSteps, ...steps]);
  }

  const panePadding = 1;

  if (run === undefined) return <CircularProgress />;
  if (run === null) return <NotFoundPage />;

  const stepElems = zipWithPrev(steps ?? [])
    .reverse()
    .map(([step, prevStep]) => (
      <StepElem
        key={step.n}
        step={step}
        role={role}
        onSubmitted={onSubmitted}
        prevStep={prevStep}
      />
    ));

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Navbar run={run} />
      <Allotment>
        {/* Left-hand side */}
        <Allotment.Pane preferredSize={'70%'}>
          {/* Steps */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              m: 1,
            }}
          >
            <GoToModal />
            {<SearchModal runId={run.id} isDM={isDM(role)} />}
            <Paper
              sx={{
                p: panePadding,
                display: 'flex',
                flexDirection: 'column-reverse',
                height: queryN === null ? '60vh' : '83vh',
                overflow: 'auto',
              }}
              id="scrollableDiv"
            >
              <InfiniteScroll
                scrollThreshold={400} // Load more when less than 400px from the top
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
                loader={<CircularProgress />}
                inverse={true}
                style={{ display: 'flex', flexDirection: 'column-reverse' }}
                scrollableTarget="scrollableDiv"
              >
                {stepElems}
              </InfiniteScroll>
            </Paper>
            {queryN !== null && (
              <Link to={{ search: `` }}>
                <Typography
                  variant="body1"
                  sx={{ position: 'relative', bottom: 0, float: 'right' }}
                >
                  Jump to last step
                </Typography>
              </Link>
            )}
            {/* Compose */}
            {queryN === null && (
              <Paper
                sx={{
                  p: panePadding,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '25vh',
                  overflow: 'auto',
                  mt: 1,
                }}
              >
                {renderComposer()}
              </Paper>
            )}
          </Box>
        </Allotment.Pane>

        {/* Right-hand side (for DM only) */}
        {isDM(role) && (
          <Allotment.Pane>
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: 1, m: 1 }}
            >
              {/* Long-term thoughts */}
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
              {/* X steps ago */}
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
            </Box>
          </Allotment.Pane>
        )}
      </Allotment>

      {/* Automatically open settings modal if description if not filled yet */}
      {isDM(role) && run !== undefined && (run.desc?.length ?? 0) === 0 && (
        <RunSettingsModal
          initRun={run}
          initOpen={true}
          onClose={(updatedRun) => setRun(updatedRun)}
        />
      )}
    </Box>
  );
}

export default RunPage;
