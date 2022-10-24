import { exportRun, exportStep } from '../export';
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
  ppptT: [],
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

const exportedStep = {
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

const run = new Run('123', 'My run', {}, 'abc', ['def', 'ghi']);

const exportedRun = {
  title: 'My run',
  authors: ['abc', 'def', 'ghi'],
  steps: [exportedStep],
};

test('exportStep', () => {
  expect(exportStep(step)).toEqual(exportedStep);
});

test('exportRun', () => {
  expect(exportRun(run, [step])).toEqual(exportedRun);
});
