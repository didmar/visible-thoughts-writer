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

export const thoughtTypesMarks = {
  [ThoughtType.Watsonian]: ['', ''],
  [ThoughtType.Doylist]: ['(', ')'],
  [ThoughtType.Meta]: ['{', '}'],
  [ThoughtType.Comment]: ['#', '#'],
};

function renderThought(thought: Thought, index: number): JSX.Element {
  const [begMark, endMark] = thoughtTypesMarks[thought.type];
  const markedText = begMark + thought.txt.trim() + endMark;
  let formattedText;
  let color = 'text.primary';
  switch (thought.type) {
    case ThoughtType.Watsonian:
      formattedText = <>{markedText}</>;
      break;
    case ThoughtType.Doylist:
      formattedText = <b>{markedText}</b>;
      break;
    case ThoughtType.Meta:
      formattedText = <i>{markedText}</i>;
      break;
    case ThoughtType.Comment:
      formattedText = <>{markedText}</>;
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

function renderBullets(bullets: Bullet[] | null): JSX.Element {
  if (bullets === null) {
    return <>(skipped)</>;
  }
  const b = bullets.map((bullet, index) => (
    <li key={index}>{renderThoughts(bullet.T)}</li>
  ));
  return <ul>{b}</ul>;
}

function renderTextYBR(textYBR: TextYBR | null): JSX.Element {
  if (textYBR === null) {
    return <>(skipped)</>;
  }
  return (
    <span>
      {textYBR.ybr ? '*YBR!* ' : ''} {textYBR.txt}
    </span>
  );
}

function renderSection(step: Step, section: Section): JSX.Element | undefined {
  const icon = sectionsData[section].icon;
  let r;
  switch (section) {
    case Section.InitT:
      r = step.initT !== undefined && (
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
      r = step.ppt !== undefined && (
        <>
          {icon} {step.ppt === null ? '(skipped)' : step.ppt}
        </>
      );
      break;
    case Section.PpptT:
      r = step.ppptT !== undefined && (
        <>
          {icon} {renderBullets(step.ppptT)}
        </>
      );
      break;
    case Section.Act:
      r = step.act !== undefined && (
        <>
          {icon} {renderTextYBR(step.act)}
        </>
      );
      break;
    case Section.PactT:
      r = step.pactT !== undefined && (
        <>
          {icon} {renderBullets(step.pactT)}
        </>
      );
      break;
    case Section.Out:
      r = step.out !== undefined && (
        <>
          {icon}
          {step.out != null ? renderTextYBR(step.out) : '(skipped)'}
        </>
      );
      break;
    default:
      throw new Error(`Unknown section: ${Section[section]}`);
      break;
  }
  return r === false ? undefined : r;
}

const StepElem: React.FunctionComponent<StepElemProps> = ({
  step,
}: StepElemProps) => {
  return (
    <div className="StepsPane">
      <>
        <h3 key={`h3-${step.n}`}>Step #{step.n}</h3>
        <Stack key={`stack-${step.n}`} spacing={2}>
          {enumKeys(Section).map((section, index) => {
            const renderedSection = renderSection(step, Section[section]);
            if (renderedSection !== undefined) {
              return <Item key={index}>{renderedSection}</Item>;
            }
            return <></>;
          })}
        </Stack>
      </>
    </div>
  );
};

export default StepElem;
