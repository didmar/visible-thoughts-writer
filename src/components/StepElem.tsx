import { Grid, Paper } from '@mui/material';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import { Bullet, Step, Thought } from '../firebase-app';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CasinoIcon from '@mui/icons-material/Casino';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

interface StepElemProps {
  step: Step;
}

export function renderLongTermThoughts(ltts: Thought[]): JSX.Element {
  const b = ltts.map((thought, index) => <li key={index}>{thought.txt}</li>);
  return <ul>{b}</ul>;
}

function renderThought(thought: Thought, index: number): JSX.Element {
  return <span key={index}>{thought.txt}.</span>;
}

function renderThoughts(thoughts: Thought[]): JSX.Element {
  return <>{thoughts.map((thought, index) => renderThought(thought, index))}</>;
}

function renderBullets(bullets: Bullet[]): JSX.Element {
  const b = bullets.map((bullet, index) => (
    <li key={index}>{renderThoughts(bullet.T)}</li>
  ));
  return <ul>{b}</ul>;
}

function renderYBR(ybr: boolean): JSX.Element {
  return <span>{ybr ? 'YBR!' : ''}</span>;
}

const StepElem: React.FunctionComponent<StepElemProps> = ({
  step,
}: StepElemProps) => {
  return (
    <div className="StepsPane">
      <>
        <h3>Step #{step.n}</h3>
        <Stack spacing={2}>
          {/* Initial thoughts */}
          <Item>
            <Grid container spacing={0}>
              <Grid item xs={1} md={1} lg={1}>
                <BubbleChartIcon />
              </Grid>
              <Grid item xs={11} md={11} lg={11}>
                {renderBullets(step.initT)}
              </Grid>
            </Grid>
          </Item>
          {/* Prompt */}
          <Item>
            <VisibilityIcon /> {renderYBR(step.pptYBR)} {step.ppt}
          </Item>
          {/* Post-prompt thoughts */}
          <Item>
            <BubbleChartIcon /> {renderBullets(step.ppptT)}
          </Item>
          {/* Action */}
          <Item>
            <DirectionsRunIcon /> {renderYBR(step.actYBR)} {step.act}
          </Item>
          {/* Post-action thoughts */}
          <Item>
            <BubbleChartIcon /> {renderBullets(step.pactT)}
          </Item>
          {/* Outcome */}
          <Item>
            <CasinoIcon /> {renderYBR(step.outYBR)} {step.out}
          </Item>
        </Stack>
      </>
    </div>
  );
};

export default StepElem;
