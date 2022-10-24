import { Bullet, Run, Step, ThoughtType } from './firebase-app';

interface ExportedThought {
  type: string;
  longterm: boolean;
  text: string;
}

interface ExportedPrompt {
  text: string;
  thoughts?: ExportedThought[][];
}

interface ExportedAction {
  text: string;
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

const THOUGHT_TYPE_TO_EXPORTED_NAME: Record<ThoughtType, string> = {
  [ThoughtType.Watsonian]: 'watsonian',
  [ThoughtType.Doylist]: 'doylist',
  [ThoughtType.Meta]: 'meta',
  [ThoughtType.Comment]: 'comment',
};

const exportThoughtSection = (bullets: Bullet[]): ExportedThought[][] => {
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
      text: `${step.act.ybr ? '<yo be real> ' : ''}${step.act.txt}`,
    };
    if (
      step.pactT !== undefined &&
      step.pactT !== null &&
      step.pactT.length > 0
    ) {
      exportedStep.action.thoughts = exportThoughtSection(step.pactT);
      if (step.out !== undefined && step.out !== null) {
        exportedStep.action.outcome = `${step.out.ybr ? '<yo be real> ' : ''}${
          step.out.txt
        }`;
      }
    }
  }

  return exportedStep;
};

export const exportRun = (run: Run, steps: Step[]): ExportedRun => {
  return {
    title: run.title,
    authors: [run.dm, ...run.players],
    steps: steps.map(exportStep),
  };
};
