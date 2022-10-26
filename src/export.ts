import {
  Bullet,
  checkStepSectionsConsistency,
  Run,
  skipInitT,
  skipPptAndPpptT,
  Step,
  TextYBR,
  ThoughtType,
  UserProfile,
} from './firebase-app';
import { isEmpty, swapKeyValue } from './utils';

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
  bullets: Bullet[]
): ExportedThought[][] => {
  return bullets.map((bullet) =>
    bullet.T.map((t) => ({
      type: THOUGHT_TYPE_TO_EXPORTED_NAME[t.type],
      longterm: t.lt,
      text: t.txt,
    }))
  );
};

export const exportStep = (step: Step): ExportedStep => {
  const exportedStep: ExportedStep = {};
  if (
    step.initT !== undefined &&
    step.initT !== null &&
    step.initT.length > 0
  ) {
    exportedStep.thoughts = exportThoughtSection(step.initT);
  }

  if (step.ppt !== undefined && step.ppt !== null) {
    exportedStep.prompt = {
      text: step.ppt,
    };
    if (
      step.ppptT !== undefined &&
      step.ppptT !== null &&
      step.ppptT.length > 0
    ) {
      exportedStep.prompt.thoughts = exportThoughtSection(step.ppptT);
    }
  }

  if (step.act !== undefined && step.act !== null) {
    exportedStep.action = {
      text: `${step.act.ybr ? YBR_MARK : ''}${step.act.txt}`,
    };
  }

  if (
    step.pactT !== undefined &&
    step.pactT !== null &&
    step.pactT.length > 0
  ) {
    exportedStep.action = {
      ...exportedStep.action,
      thoughts: exportThoughtSection(step.pactT),
    };
  }

  if (step.out !== undefined && step.out !== null) {
    exportedStep.action = {
      ...exportedStep.action,
      outcome: `${step.out.ybr ? YBR_MARK : ''}${step.out.txt}`,
    };
  }

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
  const step: Step = {
    n,
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
    } else if (step.act?.ybr === true && !isLastStep) {
      // YBR Case 2B
      step.out = null;
    }

    if (exportedStep.action.thoughts !== undefined) {
      step.pactT = importThoughtSection(exportedStep.action.thoughts);
    } else if (
      (step.act?.ybr === true && !isLastStep) ||
      exportedStep.action.outcome !== undefined
    ) {
      // YBR Case 2B
      step.pactT = null;
    }
  }

  const shouldSkipPptAndPpptT = skipPptAndPpptT(prevStep);
  if (exportedStep.prompt !== undefined) {
    if (shouldSkipPptAndPpptT) {
      throw new Error(
        'Expected ppt and pppT to be skipped based on previous step, but found prompt in the exported step.'
      );
    }
    step.ppt = exportedStep.prompt.text ?? null;
    if (exportedStep.prompt.thoughts !== undefined) {
      step.ppptT = importThoughtSection(exportedStep.prompt.thoughts);
    } else if (exportedStep.action !== undefined) {
      step.ppptT = null;
    }
  } else {
    if (shouldSkipPptAndPpptT || exportedStep.action !== undefined) {
      step.ppt = null;
      step.ppptT = null;
    }
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
  } else {
    if (
      shouldSkipInitT ||
      exportedStep.prompt !== undefined ||
      exportedStep.action !== undefined
    )
      // YBR Case 1
      step.initT = null;
  }

  checkStepSectionsConsistency(step);

  return step;
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
