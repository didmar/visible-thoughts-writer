import {
  exportAuthors,
  exportRun,
  exportStep,
  exportThoughtSection,
  importRun,
  importStep,
  importTextYBR,
  importThoughtSection,
} from '../export';
import {
  defaultThoughts,
  Run,
  RunStatus,
  Step,
  ThoughtType,
} from '../firebase-app';

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
  ppptT: defaultThoughts, // left empty
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

const adminId = 'abc';
const run = new Run(
  '123',
  'My run',
  'Description',
  [],
  RunStatus.InProgress,
  {},
  adminId,
  [adminId],
  ['def', 'ghi'],
  1
);

const exportedRun = {
  title: 'My run',
  authors: ['abc', 'def', 'ghi'],
  steps: [exportedStep1, exportedStep2],
};

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

describe('exportThoughtSection', () => {
  it('exports some thoughts', () => {
    expect(exportThoughtSection(thoughts)).toEqual(exportedThoughts);
  });
  it('exports without any empty thoughts or any empty bullets', () => {
    expect(
      exportThoughtSection([
        { T: [] },
        {
          T: [
            {
              lt: false,
              txt: '',
              type: ThoughtType.Watsonian,
            },
            {
              lt: true,
              txt: 'Meta and long-term',
              type: ThoughtType.Meta,
            },
          ],
        },
      ])
    ).toEqual([[{ longterm: true, text: 'Meta and long-term', type: 'meta' }]]);
  });
  it('exporting an empty list of bullets should return undefined', () => {
    expect(exportThoughtSection([])).toEqual(undefined);
  });
  it('exporting a bullet with empty list of thoughts should return undefined', () => {
    expect(exportThoughtSection([{ T: [] }])).toEqual(undefined);
  });
  it('exporting a bullet with a single thought but no text should return undefined', () => {
    expect(
      exportThoughtSection([
        { T: [{ lt: false, txt: '', type: ThoughtType.Watsonian }] },
      ])
    ).toEqual(undefined);
  });
  it('exporting undefined returns undefined', () => {
    expect(exportThoughtSection(undefined)).toEqual(undefined);
  });
  it('exporting null returns undefined', () => {
    expect(exportThoughtSection(null)).toEqual(undefined);
  });
});

describe('exportStep', () => {
  it('exports a step', () => {
    expect(exportStep(step)).toEqual(exportedStep1);
  });
  it('exports another step', () => {
    expect(exportStep(step2)).toEqual(exportedStep2);
  });
  it('empty texts should be removed', () => {
    expect(
      exportStep({
        n: 1,
        initT: null,
        ppt: '',
        ppptT: thoughts,
        act: {
          txt: '', // TODO this should trigger an error instead, as action must never be empty
          ybr: false,
        },
        pactT: thoughts,
        out: {
          txt: '',
          ybr: false,
        },
      })
    ).toEqual({
      prompt: {
        thoughts: exportedThoughts,
      },
      action: {
        thoughts: exportedThoughts,
      },
    });
  });
  it('do not create prompt or action objects if everything inside is skipped or empty', () => {
    expect(
      exportStep({
        n: 1,
        initT: null,
        ppt: '',
        ppptT: defaultThoughts,
        act: {
          txt: '', // TODO this should trigger an error instead, as action must never be empty
          ybr: false,
        },
        pactT: defaultThoughts,
        out: {
          txt: '',
          ybr: false,
        },
      })
    ).toEqual({});
  });
});

describe('exportAuthors', () => {
  it('exports ids if no profile is provided', () => {
    expect(exportAuthors(run, [])).toEqual(['abc', 'def', 'ghi']);
  });
  it('exports screen name and id when profile is provided', () => {
    expect(
      exportAuthors(run, [
        {
          id: 'abc',
          name: 'abcName',
          canDM: true,
          soundNotif: false,
          emailNotif: false,
          isReviewer: false,
        },
      ])
    ).toEqual(['abcName (abc)', 'def', 'ghi']);
  });
});

test('exportRun', () => {
  expect(exportRun(run, [], [step, step2])).toEqual(exportedRun);
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
  it('imports only the step number for an empty step with no previous step', () => {
    expect(importStep({}, 1, undefined, false)).toEqual({
      n: 1,
    });
  });

  it('deals with case 1 of yo be real, with a previous step that has a yo be real outcome', () => {
    expect(importStep({}, 2, step, false)).toEqual({
      n: 2,
      initT: null,
      ppt: null,
      ppptT: null,
    });
  });

  it('throws an error if the first and final step has an action but no initial thoughts', () => {
    expect(() =>
      importStep(
        {
          prompt: { text: 'prompt', thoughts: exportedThoughts },
          action: { text: 'action' },
        },
        1,
        undefined,
        true
      )
    ).toThrowError(
      'initT must not be empty: {"n":1,"initT":[{"T":[{"lt":false,"txt":"","type":0}]}],"ppt":"prompt",' +
        '"ppptT":[{"T":[{"type":0,"lt":false,"txt":"Watsonian"}]}],"act":{"ybr":false,"txt":"action"}}'
    );
  });

  it('throws an error if the first and final step has an action but no prompt', () => {
    expect(() =>
      importStep(
        { thoughts: exportedThoughts, action: { text: 'action' } },
        1,
        undefined,
        true
      )
    ).toThrowError(
      'An action with no prompt before can only happen if previous outcome has the <yo be real> case, which was not the case.'
    );
  });

  it("throws an error if previous step's outcome has yo be real tag, but prompt is defined", () => {
    expect(() =>
      importStep(
        { thoughts: exportedThoughts, action: { text: 'action' } },
        2,
        step,
        true
      )
    ).toThrowError(
      'Expected initT to be skipped based on previous step, but found thoughts in the exported step.'
    );
  });

  it("throws an error if previous step's outcome has yo be real tag, but initial thoughts are defined", () => {
    expect(() =>
      importStep(
        {
          prompt: { text: 'prompt', thoughts: exportedThoughts },
          action: { text: 'action' },
        },
        2,
        step,
        true
      )
    ).toThrowError(
      'Expected ppt and pppT to be skipped based on previous step, but found prompt in the exported step.'
    );
  });

  it('throws if outcome is not provided but action does not have <yo be real> tag and it is not the last step', () => {
    expect(() =>
      importStep(
        {
          thoughts: exportedThoughts,
          prompt: { text: 'prompt', thoughts: exportedThoughts },
          action: { text: 'action', thoughts: exportedThoughts },
        },
        1,
        undefined,
        false
      )
    ).toThrowError(
      'Outcome not defined, but action does not have <yo be real> and this is not the last step'
    );
  });

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
    // outcome may be empty or undefined, see test cases
  };

  it('deals with case 2A of yo be real by making outcome empty undefined if last step', () => {
    expect(importStep(exportedStepCase2, 1, undefined, true)).toEqual(
      stepCase2
    );
  });

  it('deals with case 2A of yo be real in the previous step and the current step being empty', () => {
    expect(importStep({}, 2, stepCase2, false)).toEqual({
      n: 2,
      initT: null,
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
      // Assume pactT was left empty and out was skipped.
      pactT: defaultThoughts,
      out: null,
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
    });
  });

  it('deals with step that has everything filled in', () => {
    expect(importStep(exportedStep1, 1, undefined, false)).toEqual({
      ...step,
      // was originally skipped, but the information was lost
      // when we exported it
      ppptT: defaultThoughts,
    });
  });
});

describe('importRun', () => {
  it('imports a run', () => {
    expect(importRun(exportedRun)).toEqual({
      title: run.title,
      steps: [
        {
          ...step,
          // was originally skipped, but the information was lost
          // when we exported it
          ppptT: defaultThoughts,
        },
        {
          ...step2,
          // same here
          pactT: defaultThoughts,
        },
      ],
    });
  });
  it('rejects a run with no title', () => {
    expect(() => importRun({ ...exportedRun, title: '' })).toThrowError(
      'Title must not be empty'
    );
  });
});
