import { Paper } from '@mui/material';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import { Section, SectionContent, Step, Thought } from '../firebase-app';
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
  isDM: boolean;
  onSubmitted?: (n: number, section: Section, content: SectionContent) => void;
}

export function renderLongTermThoughts(ltts: Thought[]): JSX.Element {
  const b = ltts.map((thought, index) => (
    <li key={index}>{renderThought(thought, 1)}</li>
  ));
  return <ul>{b}</ul>;
}

function renderThought(thought: Thought, index: number): JSX.Element {
  const leaf: ThoughtText = {
    type: 'thought',
    thoughtType: thought.type,
    lt: thought.lt,
    text: thought.txt,
  };
  return (
    <RenderedLeaf
      key={index}
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
  isDM,
  onSubmitted,
}: StepElemProps) => {
  return (
    <div className="StepsPane" key={42}>
      <h3 key={0}>Step #{step.n}</h3>
      <Stack key={1} spacing={2}>
        {step?.initT !== undefined && isDM && (
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
                onSubmitted !== undefined && isDM && step.initT !== null
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
              editable={onSubmitted !== undefined && isDM && step.ppt !== null}
              onSubmitted={onSubmitted ?? noop}
            />
          </Item>
        )}
        {step?.ppptT !== undefined && isDM && (
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
                onSubmitted !== undefined && isDM && step.ppptT !== null
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
            />
          </Item>
        )}
        {step?.pactT !== undefined && isDM && (
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
                onSubmitted !== undefined && isDM && step.pactT !== null
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
              editable={onSubmitted !== undefined && isDM && step.out !== null}
              onSubmitted={onSubmitted ?? noop}
            />
          </Item>
        )}
      </Stack>
    </div>
  );
};

export default StepElem;
