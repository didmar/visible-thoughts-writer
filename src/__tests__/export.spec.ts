import {
  exportRun,
  exportStep,
  importRun,
  importStep,
  importTextYBR,
  importThoughtSection,
} from '../export';
import { Run, Step, ThoughtType } from '../firebase-app';

const step: Step = {
  n: 1,
  initT: [
    {
      T: [
        {
          type: ThoughtType.Watsonian,
          lt: false,
          txt: 'Watsonian',
        },
        {
          type: ThoughtType.Doylist,
          lt: false,
          txt: 'Doylist',
        },
        {
          type: ThoughtType.Meta,
          lt: true,
          txt: 'Meta and long-term',
        },
        {
          type: ThoughtType.Comment,
          lt: false,
          txt: 'Comment',
        },
      ],
    },
  ],
  ppt: 'Prompt',
  ppptT: null, // skipped
  act: {
    txt: 'Action',
    ybr: false,
  },
  pactT: [
    {
      T: [
        {
          type: ThoughtType.Watsonian,
          lt: false,
          txt: 'Post-action Watsonian',
        },
      ],
    },
    {
      T: [
        {
          type: ThoughtType.Meta,
          lt: false,
          txt: 'Post-action Meta',
        },
      ],
    },
  ],
  out: {
    txt: 'Outcome',
    ybr: true,
  },
};
const step2: Step = {
  n: 2,
  initT: null,
  ppt: null,
  ppptT: null,
  act: {
    txt: 'Action 2',
    ybr: false,
  },
  pactT: null,
  out: {
    txt: 'Outcome 2',
    ybr: false,
  },
};

const exportedStep1 = {
  thoughts: [
    [
      {
        type: 'watsonian',
        longterm: false,
        text: 'Watsonian',
      },
      {
        type: 'doylist',
        longterm: false,
        text: 'Doylist',
      },
      {
        type: 'meta',
        longterm: true,
        text: 'Meta and long-term',
      },
      {
        type: 'comment',
        longterm: false,
        text: 'Comment',
      },
    ],
  ],
  prompt: {
    text: 'Prompt',
    // No post-prompt thoughts!
  },
  action: {
    text: 'Action',
    thoughts: [
      [
        {
          type: 'watsonian',
          longterm: false,
          text: 'Post-action Watsonian',
        },
      ],
      [
        {
          type: 'meta',
          longterm: false,
          text: 'Post-action Meta',
        },
      ],
    ],
    outcome: '<yo be real> Outcome',
  },
};

const exportedStep2 = {
  // thoughts and prompt skipped because previous step outcome had yo be real tag
  action: {
    text: 'Action 2',
    // Post-action thoughts skipped
    outcome: 'Outcome 2',
  },
};

const dmId = 'abc';
const run = new Run('123', 'My run', {}, dmId, ['def', 'ghi']);

const exportedRun = {
  title: 'My run',
  authors: ['abc', 'def', 'ghi'],
  steps: [exportedStep1, exportedStep2],
};

describe('exportStep', () => {
  it('exports a step', () => {
    expect(exportStep(step)).toEqual(exportedStep1);
  });
  it('exports another step', () => {
    expect(exportStep(step2)).toEqual(exportedStep2);
  });
});

test('exportRun', () => {
  expect(exportRun(run, [step, step2])).toEqual(exportedRun);
});

test('importThoughtSection', () => {
  expect(importThoughtSection(exportedStep1.thoughts)).toEqual(step.initT);
});

describe('importTextYBR', () => {
  it('imports simple text', () => {
    expect(importTextYBR('not marked')).toEqual({
      txt: 'not marked',
      ybr: false,
    });
  });
  it('imports text marked with yo be real', () => {
    expect(importTextYBR('<yo be real> marked')).toEqual({
      txt: 'marked',
      ybr: true,
    });
  });
});

describe('importStep', () => {
  it('imports all sections as undefined for an empty step with no previous step', () => {
    expect(importStep({}, 1, undefined, false)).toEqual({
      n: 1,
      initT: undefined,
      ppt: undefined,
      ppptT: undefined,
      act: undefined,
      pactT: undefined,
      out: undefined,
    });
  });

  it('deals with case 1 of yo be real, with a previous step that has a yo be real outcome', () => {
    expect(importStep({}, 1, step, false)).toEqual({
      n: 1,
      initT: null,
      ppt: null,
      ppptT: null,
      act: undefined,
      pactT: undefined,
      out: undefined,
    });
  });

  it('deals with case 1 of yo be real, with no previous step', () => {
    expect(
      importStep({ action: { text: 'action' } }, 1, undefined, false)
    ).toEqual({
      n: 1,
      initT: null,
      ppt: null,
      ppptT: null,
      act: { txt: 'action', ybr: false },
      pactT: undefined,
      out: undefined,
    });
  });

  const exportedThoughts = [
    [
      {
        type: 'watsonian',
        longterm: false,
        text: 'Watsonian',
      },
    ],
  ];
  const thoughts = [
    { T: [{ lt: false, txt: 'Watsonian', type: ThoughtType.Watsonian }] },
  ];

  const exportedStepCase2 = {
    thoughts: exportedThoughts,
    prompt: {
      text: 'Prompt',
      thoughts: exportedThoughts,
    },
    action: {
      text: '<yo be real> action',
      thoughts: exportedThoughts,
    },
  };
  const stepCase2 = {
    n: 1,
    initT: thoughts,
    ppt: 'Prompt',
    ppptT: thoughts,
    act: { txt: 'action', ybr: true },
    pactT: thoughts,
    // out may be null or undefined
  };

  it('deals with case 2A of yo be real, when it is the last step', () => {
    // If this is the last step, assume the outcome is not written yet
    expect(importStep(exportedStepCase2, 1, undefined, true)).toEqual({
      ...stepCase2,
      out: undefined,
    });
  });

  it('deals with case 2A of yo be real, when it is NOT the last step', () => {
    // Otherwise, consider that the outcome is skipped
    expect(importStep(exportedStepCase2, 1, undefined, false)).toEqual({
      ...stepCase2,
      out: null,
    });
  });

  it('deals with case 2A of yo be real in the previous step and the current step being empty', () => {
    expect(importStep({}, 2, stepCase2, false)).toEqual({
      n: 2,
      initT: null,
      ppt: undefined,
      ppptT: undefined,
      act: undefined,
      pactT: undefined,
      out: undefined,
    });
  });

  it('deals with case 2B of yo be real, when it is NOT the last step', () => {
    expect(
      importStep(
        {
          thoughts: exportedThoughts,
          prompt: {
            text: 'Prompt',
            thoughts: exportedThoughts,
          },
          action: { text: '<yo be real> action' },
        },
        1,
        undefined,
        false
      )
    ).toEqual({
      n: 1,
      initT: thoughts,
      ppt: 'Prompt',
      ppptT: thoughts,
      act: { txt: 'action', ybr: true },
      pactT: null, // assume it was skipped, since it is not the last step
      out: null, // same as above
    });
  });

  it('deals with case 2B of yo be real, when it is the last step', () => {
    expect(
      importStep(
        {
          thoughts: exportedThoughts,
          prompt: {
            text: 'Prompt',
            thoughts: exportedThoughts,
          },
          action: { text: '<yo be real> action' },
        },
        1,
        undefined,
        true
      )
    ).toEqual({
      n: 1,
      initT: thoughts,
      ppt: 'Prompt',
      ppptT: thoughts,
      act: { txt: 'action', ybr: true },
      pactT: undefined,
      out: undefined,
    });
  });

  it('deals with step that has everything filled in', () => {
    expect(importStep(exportedStep1, 1, undefined, false)).toEqual(step);
  });
});

describe('importRun', () => {
  it('imports a run', () => {
    expect(importRun(exportedRun)).toEqual({
      title: run.title,
      steps: [step, step2],
    });
  });
  it('rejects a run with no title', () => {
    expect(importRun({ ...exportedRun, title: '' })).toThrowError(
      'Title must not be empty'
    );
  });
});
