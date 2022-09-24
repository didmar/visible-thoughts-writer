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
import { getLastNSteps, Step } from '../firebase-app';
import StepElem from './StepElem';

function StepsPane(): JSX.Element {
  const { runId } = useParams();

  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    void (async function () {
      if (runId !== undefined) {
        setSteps(await getLastNSteps(runId, 1));
      }
    })();
  }, [runId]);

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
                {steps.map((step) => (
                  <StepElem key={step.n.toString()} step={step} />
                ))}
              </List>
            </Paper>
          </Grid>

          {/* X steps ago */}
          <Grid item xs={12} md={4} lg={3}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 240,
              }}
            >
              X steps ago
            </Paper>
          </Grid>

          {/* Compose */}
          <Grid item xs={12} md={8} lg={3}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: '15vh',
                overflow: 'auto',
              }}
            >
              Compose
            </Paper>
          </Grid>

          {/* Long-term thoughts */}
          <Grid item xs={12} md={4} lg={9}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 240,
              }}
            >
              Long-term thoughts
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default StepsPane;
