import { Box, Divider, Paper, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import { useLocation } from 'react-router-dom';
import { isDM, isPlayer, Role, Section, Step, Thought } from '../firebase-app';
import { noop } from '../utils';
import Composer from './composer/Composer';
import RenderedLeaf from './composer/RenderedLeaf';
import { ComposerMode, ThoughtText } from './composer/types';
import { SectionContent } from './composer/utils';
import CopyToClipboard from './CopyToClipboard';

interface StepElemProps {
  step: Step;
  roles: Set<Role> | null | undefined;
  userIsReviewer: boolean;
  runInProgress: boolean;
  onSubmitted?: (n: number, content: SectionContent, section: Section) => void;
  title?: string;
  prevStep?: Step;
}

export function renderLongTermThoughts(
  ltts: Array<[number, Thought[]]>
): JSX.Element {
  const lis = ltts
    .flatMap(([_, thoughts]) => thoughts)
    .map((thought, index) => <li key={index}>{renderThought(thought)}</li>);
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
  roles,
  userIsReviewer,
  runInProgress,
  onSubmitted,
  title,
  prevStep,
}: StepElemProps) => {
  const location = useLocation();

  const previousOutcomeYBR = prevStep?.out?.ybr ?? false;

  const titleElem =
    title !== '' ? (
      <Box display="flex">
        <Box
          sx={{
            flexGrow: 1,
          }}
        >
          <Divider sx={{ mb: 0.5 }}>
            <Typography variant="h6" key={0}>
              {title ?? `${step.n}`}
            </Typography>
          </Divider>
        </Box>
        <Box
          sx={{
            flexShrink: 1,
          }}
        >
          <CopyToClipboard
            content={`${window.location.origin}${location.pathname}?n=${step.n}`}
          />
        </Box>
      </Box>
    ) : (
      <></>
    );

  /**
   * Thought sections may be visible to the user if:
   * - The user is a DM for this run
   * - The run is not in progress (completed or archived)
   * - The user has the reviewer status
   */
  const visibleThoughts = isDM(roles) || !runInProgress || userIsReviewer;

  return (
    <Box className="StepsPane" sx={{ mx: 0.5, mt: 0.5, mb: 0.5 }} key={42}>
      {titleElem}
      <Stack key={1} spacing={2}>
        {/* Display initial thoughts, only if the user may see it */}
        {step?.initT !== undefined && visibleThoughts && (
          <Paper key={0} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.initT}
              section={Section.InitT}
              n={step.n}
              editable={
                onSubmitted !== undefined &&
                (isDM(roles) || userIsReviewer) &&
                !previousOutcomeYBR
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}

        {/* Display the prompt */}
        {step?.ppt !== undefined && (
          <Paper key={1} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.ppt}
              section={Section.Ppt}
              n={step.n}
              editable={
                onSubmitted !== undefined &&
                (isDM(roles) || userIsReviewer) &&
                !previousOutcomeYBR
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}

        {/* Display the post-prompt thoughts, only if the user may see it */}
        {step?.ppptT !== undefined && visibleThoughts && (
          <Paper key={2} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.ppptT}
              section={Section.PpptT}
              n={step.n}
              editable={
                onSubmitted !== undefined &&
                (isDM(roles) || userIsReviewer) &&
                !previousOutcomeYBR
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}

        {/* Display the action */}
        {step?.act !== undefined && (
          <Paper key={3} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.act}
              n={step.n}
              section={Section.Act}
              // Action is only editable if the user is both player and DM, or a reviewer
              editable={
                onSubmitted !== undefined &&
                ((isDM(roles) && isPlayer(roles)) || userIsReviewer) &&
                step.act !== null
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}

        {/* Display the post-action thoughts, only if the user may see it */}
        {step?.pactT !== undefined && visibleThoughts && (
          <Paper key={4} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.pactT}
              section={Section.PactT}
              n={step.n}
              editable={
                onSubmitted !== undefined && (isDM(roles) || userIsReviewer)
              }
              onSubmitted={onSubmitted ?? noop}
            />
          </Paper>
        )}

        {/* Display the outcome */}
        {step?.out !== undefined && (
          <Paper key={5} {...itemProps}>
            <Composer
              initMode={ComposerMode.VIEW}
              initValue={step.out}
              section={Section.Out}
              n={step.n}
              editable={
                onSubmitted !== undefined && (isDM(roles) || userIsReviewer)
              }
              onSubmitted={onSubmitted ?? noop}
              actionHasYBRTag={step.act?.ybr ?? false}
            />
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default StepElem;
