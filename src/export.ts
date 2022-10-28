import {
  Bullet,
  checkStepSectionsConsistency,
  defaultTextYBR,
  defaultThoughts,
  Run,
  skipInitT,
  skipPptAndPpptT,
  Step,
  TextYBR,
  ThoughtType,
  UserProfile,
} from './firebase-app';
import { isEmpty, swapKeyValue, withoutUndefinedValues } from './utils';

interface ExportedThought {
  type: string;
  longterm: boolean;
  text: string;
}

interface ExportedPrompt {
  text?: string;
  thoughts?: ExportedThought[][];
}

interface ExportedAction {
  text?: string;
  thoughts?: ExportedThought[][];
  outcome?: string;
}

interface ExportedStep {
  thoughts?: ExportedThought[][];
  prompt?: ExportedPrompt;
  action?: ExportedAction;
}

export interface ExportedRun {
  title: string;
  authors: string[];
  steps: ExportedStep[];
}

const EXPORTED_NAME_TO_THOUGHT_TYPE: Record<string, ThoughtType> = {
  watsonian: ThoughtType.Watsonian,
  doylist: ThoughtType.Doylist,
  meta: ThoughtType.Meta,
  comment: ThoughtType.Comment,
};

const THOUGHT_TYPE_TO_EXPORTED_NAME: Record<ThoughtType, string> = swapKeyValue(
  EXPORTED_NAME_TO_THOUGHT_TYPE
);

const YBR_MARK = '<yo be real> ';

export const exportThoughtSection = (
  bullets: Bullet[] | null | undefined
): ExportedThought[][] | undefined => {
  if (bullets === undefined || bullets === null) return undefined;

  const exportThoughts = bullets
    .map((bullet) =>
      bullet.T.map((t) => ({
        type: THOUGHT_TYPE_TO_EXPORTED_NAME[t.type],
        longterm: t.lt,
        text: t.txt,
      })).filter((t) => t.text !== '')
    )
    .filter((t) => t.length > 0);

  if (exportThoughts.length === 0) return undefined;
  return exportThoughts;
};

export const exportStep = (step: Step): ExportedStep => {
  const exportedStep: ExportedStep = {};

  const thoughts = exportThoughtSection(step.initT);
  if (thoughts !== undefined) exportedStep.thoughts = thoughts;

  const prompt: ExportedPrompt = {};
  if (step.ppt !== undefined && step.ppt !== null && step.ppt !== '')
    prompt.text = step.ppt;
  const exportedPptT = exportThoughtSection(step.ppptT);
  if (exportedPptT !== undefined) prompt.thoughts = exportedPptT;
  if (!isEmpty(prompt)) exportedStep.prompt = prompt;

  const action: ExportedAction = {};
  if (
    step.act !== undefined &&
    step.act !== null &&
    (step.act.txt !== '' || step.act.ybr)
  )
    action.text = `${step.act.ybr ? YBR_MARK : ''}${step.act.txt}`;
  const exportedPactT = exportThoughtSection(step.pactT);
  if (exportedPactT !== undefined) action.thoughts = exportedPactT;
  if (
    step.out !== undefined &&
    step.out !== null &&
    (step.out.txt !== '' || step.out.ybr)
  )
    action.outcome = `${step.out.ybr ? YBR_MARK : ''}${step.out.txt}`;
  if (!isEmpty(action)) exportedStep.action = action;

  return exportedStep;
};

export const exportAuthors = (
  run: Run,
  userProfiles: UserProfile[]
): string[] => {
  return [run.dm, ...run.players].map((uid) => {
    const userProfile = userProfiles.find((u) => u.id === uid);
    if (userProfile === undefined) {
      return uid;
    }
    return `${userProfile.name} (${uid})`;
  });
};

export const exportRun = (
  run: Run,
  userProfiles: UserProfile[],
  sortedSteps: Step[]
): ExportedRun => {
  const exportedSteps = sortedSteps.map(exportStep);

  // Remove the last step if it's empty
  if (
    exportedSteps.length > 0 &&
    isEmpty(exportedSteps[exportedSteps.length - 1])
  ) {
    exportedSteps.pop();
  }

  return {
    title: run.title,
    authors: exportAuthors(run, userProfiles),
    steps: exportedSteps,
  };
};

interface ImportedRun {
  title: string;
  steps: Step[];
}

export const importThoughtSection = (
  exportedBullets: ExportedThought[][]
): Bullet[] => {
  return exportedBullets.map((bullet) => {
    return {
      T: bullet.map((t) => {
        return {
          type: EXPORTED_NAME_TO_THOUGHT_TYPE[t.type],
          lt: t.longterm,
          txt: t.text,
        };
      }),
    };
  });
};

export const importTextYBR = (text: string): TextYBR => {
  if (text.startsWith(YBR_MARK)) {
    return {
      ybr: true,
      txt: text.substring(YBR_MARK.length),
    };
  }
  return {
    ybr: false,
    txt: text,
  };
};

export const importStep = (
  exportedStep: ExportedStep,
  n: number,
  prevStep: Step | undefined,
  isLastStep: boolean
): Step => {
  // Import is a bit complicated because the absence of a field in the exported step
  // might or might not mean that it was skipped.

  // Start with everything as undefined
  const step: Partial<Step> = {
    initT: undefined,
    ppt: undefined,
    ppptT: undefined,
    act: undefined,
    pactT: undefined,
    out: undefined,
  };

  if (exportedStep.action !== undefined) {
    if (exportedStep.action.text !== undefined) {
      step.act = importTextYBR(exportedStep.action.text);
    }

    if (exportedStep.action.outcome !== undefined) {
      step.out = importTextYBR(exportedStep.action.outcome);
    } else {
      // YBR Case 2:
      // When importing a step, there is no way to tell if the outcome
      // was left empty (2A) or skipped (2B).
      // To leave it editable by the DM, we set it to an empty string,
      // unless this is the last step, in which case we set it to undefined.
      if (!isLastStep) {
        step.out = defaultTextYBR;
      }
    }

    if (exportedStep.action.thoughts !== undefined) {
      step.pactT = importThoughtSection(exportedStep.action.thoughts);
    } else if (step.out !== undefined) {
      step.pactT = defaultThoughts;
    }
  }

  const shouldSkipPptAndPpptT = skipPptAndPpptT(prevStep);
  if (exportedStep.prompt !== undefined) {
    if (shouldSkipPptAndPpptT) {
      throw new Error(
        'Expected ppt and pppT to be skipped based on previous step, but found prompt in the exported step.'
      );
    }
    step.ppt = exportedStep.prompt.text;
    if (exportedStep.prompt.thoughts !== undefined) {
      step.ppptT = importThoughtSection(exportedStep.prompt.thoughts);
    } else if (exportedStep.action !== undefined) {
      step.ppptT = defaultThoughts; // Assume it was left empty
    }
  } else if (shouldSkipPptAndPpptT) {
    step.ppt = null;
    step.ppptT = null;
  } else if (exportedStep.action !== undefined) {
    throw new Error(
      'An action with no prompt before can only happen if previous outcome has the <yo be real> case, which was not the case.'
    );
  }

  const shouldSkipInitT = skipInitT(prevStep);
  if (exportedStep.thoughts !== undefined) {
    if (shouldSkipInitT) {
      throw new Error(
        'Expected initT to be skipped based on previous step, ' +
          'but found thoughts in the exported step.'
      );
    }
    step.initT = importThoughtSection(exportedStep.thoughts);
  } else if (shouldSkipInitT) {
    // YBR Case 1
    step.initT = null;
  } else if (
    exportedStep.prompt !== undefined ||
    exportedStep.action !== undefined
  ) {
    step.initT = defaultThoughts; // Assume it was left empty
  }

  const _step = { n, ...withoutUndefinedValues(step) };
  checkStepSectionsConsistency(_step);
  return _step;
};

export const importRun = (exportedRun: ExportedRun): ImportedRun => {
  if (exportedRun.title.length === 0)
    throw new Error('Title must not be empty');
  if (exportedRun.steps.length === 0) throw new Error('No steps found');

  const steps = exportedRun.steps.reduce<Step[]>((acc, exportedStep, index) => {
    const n = index + 1;
    const prevStep = acc.length > 0 ? acc[acc.length - 1] : undefined;
    const isLastStep = index === exportedRun.steps.length - 1;
    return [...acc, importStep(exportedStep, n, prevStep, isLastStep)];
  }, []);

  return { title: exportedRun.title, steps };
};
