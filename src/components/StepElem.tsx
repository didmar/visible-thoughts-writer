import { Paper } from '@mui/material';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import {
  isDM,
  Role,
  Section,
  SectionContent,
  Step,
  Thought,
} from '../firebase-app';
import { noop } from '../utils';
import Composer from './composer/Composer';
import { toCustomElement } from './composer/parsing';
import RenderedLeaf from './composer/RenderedLeaf';
import { ComposerMode, ThoughtText } from './composer/types';
// import { enumKeys } from '../utils';

const Item = styled(Paper)(({ theme }) => ({
  // backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  // padding: theme.spacing(1),
  // textAlign: 'center',
  // color: theme.palette.text.secondary,
}));

interface StepElemProps {
  step: Step;
  role: Role | null | undefined;
  onSubmitted?: (n: number, section: Section, content: SectionContent) => void;
  title?: string;
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

const StepElem: React.FunctionComponent<StepElemProps> = ({
  step,
  role,
  onSubmitted,
  title,
}: StepElemProps) => {
  return (
    <div className="StepsPane" key={42}>
      <h3 key={0}>{title ?? `Step #${step.n}`}</h3>
      <Stack key={1} spacing={2}>
        {step?.initT !== undefined && isDM(role) && (
          <Item key={0}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={toCustomElement(
                step.initT !== null
                  ? { kind: 'bullets', value: step.initT }
                  : null
              )}
              section={Section.InitT}
              n={step.n}
              editable={
                onSubmitted !== undefined && isDM(role) && step.initT !== null
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Item>
        )}
        {step?.ppt !== undefined && (
          <Item key={1}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={toCustomElement(
                step.ppt !== null ? { kind: 'text', value: step.ppt } : null
              )}
              section={Section.Ppt}
              n={step.n}
              editable={
                onSubmitted !== undefined && isDM(role) && step.ppt !== null
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Item>
        )}
        {step?.ppptT !== undefined && isDM(role) && (
          <Item key={2}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={toCustomElement(
                step.ppptT !== null
                  ? { kind: 'bullets', value: step.ppptT }
                  : null
              )}
              section={Section.PpptT}
              n={step.n}
              editable={
                onSubmitted !== undefined && isDM(role) && step.ppptT !== null
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Item>
        )}
        {step?.act !== undefined && (
          <Item key={3}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={toCustomElement(
                step.act !== null ? { kind: 'ybrtext', value: step.act } : null
              )}
              n={step.n}
              section={Section.Act}
              editable={
                onSubmitted !== undefined &&
                role === Role.Both &&
                step.act !== null
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Item>
        )}
        {step?.pactT !== undefined && isDM(role) && (
          <Item key={4}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={toCustomElement(
                step.pactT !== null
                  ? { kind: 'bullets', value: step.pactT }
                  : null
              )}
              section={Section.PactT}
              n={step.n}
              editable={
                onSubmitted !== undefined && isDM(role) && step.pactT !== null
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Item>
        )}
        {step?.out !== undefined && (
          <Item key={5}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={toCustomElement(
                step.out !== null ? { kind: 'ybrtext', value: step.out } : null
              )}
              section={Section.Out}
              n={step.n}
              editable={
                onSubmitted !== undefined && isDM(role) && step.out !== null
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Item>
        )}
      </Stack>
    </div>
  );
};

export default StepElem;
