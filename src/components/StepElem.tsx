import { Grid, Paper, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import {
  Bullet,
  Section,
  Step,
  TextYBR,
  Thought,
  ThoughtType,
} from '../firebase-app';
import { sectionsData } from '../Section';
import { enumKeys } from '../utils';

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
  const b = ltts.map((thought, index) => (
    <li key={index}>{renderThought(thought, 1)}</li>
  ));
  return <ul>{b}</ul>;
}

function renderThought(thought: Thought, index: number): JSX.Element {
  let formattedText;
  let color = 'text.primary';
  switch (thought.type) {
    case ThoughtType.Watsonian:
      formattedText = <>{thought.txt.trim()}</>;
      break;
    case ThoughtType.Doylist:
      formattedText = <b>{'(' + thought.txt.trim() + ')'}</b>;
      break;
    case ThoughtType.Meta:
      formattedText = <i>{'{' + thought.txt.trim() + '}'}</i>;
      break;
    case ThoughtType.Comment:
      formattedText = <>#{thought.txt.trim()}#</>;
      color = 'text.secondary';
      break;
    default:
      throw new Error(`Unknown thought type: ${thought.type as number}`);
  }
  if (thought.lt) {
    formattedText = <u>{formattedText}</u>;
  }
  return (
    <span key={index}>
      <Typography variant="caption" sx={{ color }}>
        {formattedText}.
      </Typography>
    </span>
  );
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

function renderTextYBR({ txt, ybr }: TextYBR): JSX.Element {
  return (
    <span>
      {ybr ? 'YBR!' : ''} {txt}
    </span>
  );
}

function renderSection(step: Step, section: Section): JSX.Element {
  const icon = sectionsData[section].icon;
  let r;
  switch (section) {
    case Section.InitT:
      r = (
        <Grid container spacing={0}>
          <Grid item xs={1} md={1} lg={1}>
            {icon}
          </Grid>
          <Grid item xs={11} md={11} lg={11}>
            {renderBullets(step.initT)}
          </Grid>
        </Grid>
      );
      break;
    case Section.Ppt:
      r = (
        <>
          {icon} {step.ppt}
        </>
      );
      break;
    case Section.PpptT:
      r = (
        <>
          {icon} {renderBullets(step.ppptT)}
        </>
      );
      break;
    case Section.Act:
      r = (
        <>
          {icon} {renderTextYBR(step.act)}
        </>
      );
      break;
    case Section.PactT:
      r = (
        <>
          {icon} {renderBullets(step.pactT)}
        </>
      );
      break;
    case Section.Out:
      r = (
        <>
          {icon}
          {step.out != null ? renderTextYBR(step.out) : 'Skipped'}
        </>
      );
      break;
    default:
      throw new Error(`Unknown section: ${Section[section]}`);
      break;
  }
  return r;
}

const StepElem: React.FunctionComponent<StepElemProps> = ({
  step,
}: StepElemProps) => {
  return (
    <div className="StepsPane">
      <>
        <h3>Step #{step.n}</h3>
        <Stack spacing={2}>
          {enumKeys(Section).map((section, index) => (
            <Item key={index}>{renderSection(step, Section[section])}</Item>
          ))}
        </Stack>
      </>
    </div>
  );
};

export default StepElem;
