import {
  AppBar,
  Box,
  Container,
  Grid,
  IconButton,
  List,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import { Menu, Settings, AccountCircle } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getLastNSteps,
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
} from '../firebase-app';
import StepElem, { renderLongTermThoughts } from './StepElem';
import Composer from './Composer';

// How many steps ago to give a hint of
const X = 50;

function StepsPane(): JSX.Element {
  const { runId } = useParams<string>();

  const [steps, setSteps] = useState<Step[] | undefined>(undefined);
  const [xStepAgo, setXStepAgo] = useState<Step | undefined>(undefined);
  const [ltts, setLtts] = useState<Thought[]>([]);
  const [title, setTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    void (async function () {
      console.log(' ### useEffect runId  ###');
      if (runId !== undefined) {
        // Init steps
        const _steps = await getLastNSteps(runId, 1);
        setSteps(_steps);
      }
    })();
  }, []);

  useEffect(() => {
    void (async function () {
      if (runId !== undefined && steps !== undefined) {
        // Must init first/next step?
        const section = getNextSection();
        if (section === undefined) {
          // Create the next step
          const currentStep =
            steps.length !== 0 ? steps[steps.length - 1] : undefined;
          const newStep = createNextStep(currentStep);
          console.log('Created new step: ', newStep);
          await addStep(runId, newStep);
          setSteps([...steps, newStep]);
        } else {
          // Init step from x steps ago
          const lastN = steps[steps.length - 1].n;
          const _xStepAgo = await getStepN(runId, Math.max(lastN - X, 1));
          if (_xStepAgo !== undefined) {
            setXStepAgo(_xStepAgo);
          }
          // Init long term thoughts and run title
          const run = await getRun(runId);
          if (run !== undefined) {
            setTitle(run.title);
            setLtts(run.lttsToArray());
          }
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

    // Update in Firebase
    void (async () => {
      await updateStep(runId, lastStep.n, update);
      if (lttsUpdate.length !== 0) {
        await updateRunLongTermThoughtsForStep(runId, lastStep.n);
      }
    })();

    // Update our states
    const updatedLastStep: Step = { ...lastStep, ...update };
    setSteps([...steps.slice(0, -1), updatedLastStep]);
    if (lttsUpdate.length !== 0) {
      setLtts([...ltts, ...lttsUpdate]);
    }
  };

  function getNextSection(): Section | undefined {
    if (steps === undefined || steps.length === 0) return undefined;
    const section = getNextSectionForStep(steps[steps.length - 1]);
    return section;
  }

  function renderComposer(): JSX.Element {
    const section = getNextSection();
    return section !== undefined ? (
      <Composer section={section} onSubmitted={onSubmitted} />
    ) : (
      <>Wait...</>
    );
  }

  return (
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
          <IconButton size="large" aria-label="search" color="inherit">
            <Settings />
          </IconButton>

          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Grid container spacing={3}>
          {/* Steps */}
          <Grid item xs={12} md={8} lg={9}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: '70vh',
                overflow: 'auto',
              }}
            >
              <List>
                {steps?.map((step) => (
                  <StepElem key={step.n.toString()} step={step} />
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Long-term thoughts */}
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
              {xStepAgo !== undefined && <StepElem step={xStepAgo} />}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default StepsPane;
