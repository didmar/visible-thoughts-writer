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
  getRunLongTermThoughts,
  Bullet,
  getNextSectionForStep,
  Section,
  addStep,
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
        console.log('### useEffect steps ###');
        // Must init next step?
        const section = getNextSection();
        if (section === undefined) {
          await createNextStep();
        } else {
          console.log('Section: ', Section[section]);
          // Init step from x steps ago
          const lastN = steps[steps.length - 1].n;
          const _xStepAgo = await getStepN(runId, Math.max(lastN - X, 1));
          if (_xStepAgo !== undefined) {
            setXStepAgo(_xStepAgo);
          }
          // Init long term thoughts
          setLtts(await getRunLongTermThoughts(runId));
        }
      }
    })();
  }, [steps]);

  function onSubmitted(bullets: Bullet[]): void {
    console.log('Submitted! ', bullets);
  }

  async function createNextStep(): Promise<void> {
    if (steps === undefined || runId === undefined) return;
    const n = steps.length !== 0 ? steps[steps.length - 1].n + 1 : 1;
    const newStep = new Step(n);
    console.log('Created new step: ', newStep);
    await addStep(runId, newStep);
    setSteps([...steps, newStep]);
  }

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
            Run {runId?.toString()}
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
