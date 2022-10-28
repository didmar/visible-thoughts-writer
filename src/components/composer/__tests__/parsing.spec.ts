import { parse } from '../parsing';
import { BulletElement, TextElement, YBRTextElement } from '../types';
import { ThoughtType } from '../../../firebase-app';

it('parses text', () => {
  const children: TextElement[] = [
    {
      type: 'text',
      children: [
        {
          type: 'text',
          text: 'Hey!\n This is a test.',
        },
      ],
    },
  ];
  const textYBR = parse(children);
  expect(textYBR).toEqual({ kind: 'text', value: 'Hey!\n This is a test.' });
});

it('parses YBR text', () => {
  const children: YBRTextElement[] = [
    {
      type: 'ybrtext',
      ybr: true,
      children: [
        { type: 'text', text: 'Hey!   ' },
        { type: 'text', text: '   This is a test.' },
      ],
    },
  ];
  const textYBR = parse(children);
  expect(textYBR).toEqual({
    kind: 'ybrtext',
    value: {
      txt: 'Hey!\nThis is a test.',
      ybr: true,
    },
  });
});

it('should parse to bullets', () => {
  const children: BulletElement[] = [
    {
      type: 'bullet',
      children: [
        {
          type: 'thought',
          text: 'Watsonian',
          thoughtType: ThoughtType.Watsonian,
          lt: false,
        },
        {
          type: 'eot',
          text: '.',
        },
        {
          type: 'thought',
          text: 'Doylist',
          thoughtType: ThoughtType.Doylist,
          lt: false,
        },
        {
          type: 'eot',
          text: '!',
        },
        {
          type: 'eot',
          text: '!',
        },
        {
          type: 'thought',
          text: '  Meta',
          thoughtType: ThoughtType.Meta,
          lt: false,
        },
        {
          type: 'eot',
          text: '?',
        },
        {
          type: 'thought',
          text: 'Comment',
          thoughtType: ThoughtType.Comment,
          lt: false,
        },
        {
          type: 'eot',
          text: '.',
        },
        {
          type: 'thought',
          text: 'Meta and long-term  ',
          thoughtType: ThoughtType.Meta,
          lt: true,
        },
        {
          type: 'eot',
          text: '!?',
        },
      ],
    },
    {
      type: 'bullet',
      children: [
        {
          type: 'eot',
          text: '???',
        },
        {
          type: 'thought',
          text: 'Thought from another bullet',
          thoughtType: ThoughtType.Watsonian,
          lt: false,
        },
      ],
    },
  ];
  const bullets = parse(children);
  expect(bullets).toEqual({
    kind: 'bullets',
    value: [
      {
        T: [
          { lt: false, txt: 'Watsonian.', type: 0 },
          { lt: false, txt: 'Doylist!!', type: 1 },
          { lt: false, txt: 'Meta?', type: 2 },
          { lt: false, txt: 'Comment.', type: 3 },
          { lt: true, txt: 'Meta and long-term!?', type: 2 },
        ],
      },
      { T: [{ lt: false, txt: 'Thought from another bullet', type: 0 }] },
    ],
  });
});

it('parses empty text', () => {
  const children: TextElement[] = [
    {
      type: 'text',
      children: [
        {
          type: 'text',
          text: '',
        },
      ],
    },
  ];
  const text = parse(children);
  expect(text).toEqual({ kind: 'text', value: '' });
});

it('parses empty bullet', () => {
  const children: BulletElement[] = [
    {
      type: 'bullet',
      children: [
        {
          type: 'thought',
          text: '',
          thoughtType: ThoughtType.Watsonian,
          lt: false,
        },
      ],
    },
  ];
  const text = parse(children);
  expect(text).toEqual({
    kind: 'bullets',
    value: [{ T: [{ lt: false, txt: '', type: 0 }] }],
  });
});
