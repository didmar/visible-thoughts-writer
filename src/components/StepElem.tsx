import { Box, Divider, Paper, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import { isDM, Role, Section, Step, Thought } from '../firebase-app';
import { noop } from '../utils';
import Composer from './composer/Composer';
import RenderedLeaf from './composer/RenderedLeaf';
import { ComposerMode, ThoughtText } from './composer/types';
import { SectionContent } from './composer/utils';

interface StepElemProps {
  step: Step;
  role: Role | null | undefined;
  onSubmitted?: (n: number, content: SectionContent, section: Section) => void;
  title?: string;
  prevStep?: Step;
}

export function renderLongTermThoughts(ltts: Thought[]): JSX.Element {
  const lis = ltts.map((thought, index) => (
    <li key={index}>{renderThought(thought)}</li>
  ));
  return <ul>{lis}</ul>;
}

function renderThought(thought: Thought): JSX.Element {
  const leaf: ThoughtText = {
    type: 'thought',
    thoughtType: thought.type,
    lt: thought.lt,
    text: thought.txt,
  };
  return (
    <RenderedLeaf
      leaf={leaf}
      text={leaf}
      attributes={{ 'data-slate-leaf': true }}
    >
      {thought.txt}
    </RenderedLeaf>
  );
}

const itemProps = {
  elevation: 4,
};

const StepElem: React.FunctionComponent<StepElemProps> = ({
  step,
  role,
  onSubmitted,
  title,
  prevStep,
}: StepElemProps) => {
  const previousOutcomeYBR = prevStep?.out?.ybr ?? false;

  return (
    <Box className="StepsPane" sx={{ mx: 0.5, mt: 0.5, mb: 0.5 }} key={42}>
      {title !== '' && (
        <Divider sx={{ mb: 0.5 }}>
          <Typography variant="h6" key={0}>
            {title ?? `${step.n}`}
          </Typography>
        </Divider>
      )}
      <Stack key={1} spacing={2}>
        {step?.initT !== undefined && isDM(role) && (
          <Paper key={0} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.initT}
              section={Section.InitT}
              n={step.n}
              editable={
                onSubmitted !== undefined && isDM(role) && !previousOutcomeYBR
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}
        {step?.ppt !== undefined && (
          <Paper key={1} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.ppt}
              section={Section.Ppt}
              n={step.n}
              editable={
                onSubmitted !== undefined && isDM(role) && !previousOutcomeYBR
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}
        {step?.ppptT !== undefined && isDM(role) && (
          <Paper key={2} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.ppptT}
              section={Section.PpptT}
              n={step.n}
              editable={
                onSubmitted !== undefined && isDM(role) && !previousOutcomeYBR
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}
        {step?.act !== undefined && (
          <Paper key={3} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.act}
              n={step.n}
              section={Section.Act}
              editable={
                onSubmitted !== undefined &&
                role === Role.Both &&
                step.act !== null
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}
        {step?.pactT !== undefined && isDM(role) && (
          <Paper key={4} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.pactT}
              section={Section.PactT}
              n={step.n}
              editable={onSubmitted !== undefined && isDM(role)}
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}
        {step?.out !== undefined && (
          <Paper key={5} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.out}
              section={Section.Out}
              n={step.n}
              editable={onSubmitted !== undefined && isDM(role)}
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default StepElem;
