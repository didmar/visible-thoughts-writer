import { Bullet, Section, Thought } from '../../firebase-app';
import {
  BulletElement,
  CustomElement,
  EndOfThoughtText,
  TextElement,
  ThoughtText,
  YBRTextElement,
} from './types';
import {
  getDefaultSectionContent,
  getDefaultSlateValue,
  parseThought,
  SectionContent,
} from './utils';

export function toCustomElement(
  sectionContent: SectionContent,
  section: Section
): CustomElement[] {
  if (sectionContent === null) return getDefaultSlateValue(section);
  switch (sectionContent.kind) {
    case 'bullets': {
      return sectionContent.value.map((bullet: Bullet) => {
        return {
          type: 'bullet',
          children: thoughtsToCustomTexts(bullet.T),
        };
      });
    }
    case 'ybrtext': {
      const { txt, ybr } = sectionContent.value;
      return [
        {
          type: 'ybrtext',
          ybr,
          children: [{ type: 'text', text: txt }],
        },
      ];
    }
    case 'text':
      return [
        {
          type: 'text',
          children: [{ type: 'text', text: sectionContent.value }],
        },
      ];
  }
}

function thoughtsToCustomTexts(
  thoughts: Thought[]
): Array<ThoughtText | EndOfThoughtText> {
  return thoughts.flatMap((thought: Thought) =>
    parseThought(thought.txt, thought.lt, thought.type)
  );
}

export function parse(children: CustomElement[]): SectionContent {
  if (children.length === 0) return null;
  switch (children[0].type) {
    case 'bullet':
      return parseToBullets(children as BulletElement[]);
    case 'ybrtext':
      return parseToTextYBR(children as YBRTextElement[]);
    case 'text':
      return parseToString(children as TextElement[]);
  }
}

function parseToBullets(bulletElems: BulletElement[]): SectionContent {
  if (bulletElems.length === 0)
    throw new Error('BulletElement list must never be empty!');

  const bullets = bulletElems.flatMap((bulletElem: BulletElement) => {
    const thoughts: Thought[] = [];
    bulletElem.children.forEach((t: ThoughtText | EndOfThoughtText) => {
      if (t.type === 'eot') {
        if (thoughts.length > 0) {
          thoughts[thoughts.length - 1].txt =
            thoughts[thoughts.length - 1].txt + t.text.trim();
        }
      } else {
        const txt = t.text.trim();
        // Exclude thoughts with an empty text
        if (txt !== '')
          thoughts.push({
            txt,
            lt: t.lt,
            type: t.thoughtType,
          });
      }
    });
    // Exclude bullets that only had empty thoughts
    if (thoughts.length === 0) return [];
    return [{ T: thoughts }];
  });

  // If all bullets were empty, return a bullet with an empty text
  if (bullets.length === 0) return getDefaultSectionContent(Section.InitT);

  return { kind: 'bullets', value: bullets };
}

function parseToTextYBR(ybrTextElems: YBRTextElement[]): SectionContent {
  if (ybrTextElems.length === 0)
    throw new Error('YBRTextElement list must never be empty!');
  if (ybrTextElems.length > 1)
    throw new Error('Must not have more than one YBRTextElement!');

  const [ybrTextElem] = ybrTextElems;
  const txt = ybrTextElem.children
    .map((t) => {
      return t.text.trim();
    })
    .join('\n');

  return {
    kind: 'ybrtext',
    value: {
      txt,
      ybr: ybrTextElem.ybr,
    },
  };
}

function parseToString(textElems: TextElement[]): SectionContent {
  if (textElems.length === 0)
    throw new Error('TextElement list must never be empty!');

  const txt = textElems
    .flatMap((textElem) =>
      textElem.children.map((t) => {
        return t.text.trim();
      })
    )
    .join('\n');

  return { kind: 'text', value: txt };
}
