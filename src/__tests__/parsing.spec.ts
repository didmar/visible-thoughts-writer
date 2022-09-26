import { Section } from '../firebase-app';
import { parse } from '../parsing';

it('should parse to bullets', () => {
  const children = [
    {
      type: 'paragraph',
      children: [
        {
          text: 'Watsonian. (Doylist). {Meta}. #Comment#.',
        },
      ],
    },
    {
      type: 'paragraph',
      children: [
        {
          text: '[(LT Doylist)]. {[LT Meta]}.',
        },
      ],
    },
  ];
  const bullets = parse(children, Section.PpptT);
  expect(bullets).toEqual([
    {
      T: [
        {
          lt: false,
          txt: 'Watsonian',
          type: 0,
        },
        {
          lt: false,
          txt: 'Doylist',
          type: 1,
        },
        {
          lt: false,
          txt: 'Meta',
          type: 2,
        },
        {
          lt: false,
          txt: 'Comment',
          type: 3,
        },
      ],
    },
    {
      T: [
        {
          lt: true,
          txt: 'LT Doylist',
          type: 1,
        },
        {
          lt: true,
          txt: 'LT Meta',
          type: 2,
        },
      ],
    },
  ]);
});
