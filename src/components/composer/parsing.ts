import { Bullet, Section, Thought } from '../../firebase-app';
import {
  BulletElement,
  CustomElement,
  EndOfThoughtText,
  TextElement,
  ThoughtText,
  YBRTextElement,
} from './types';
import { getDefaultSlateValue, SectionContent } from './utils';

export function toCustomElement(
  sectionContent: SectionContent,
  section: Section
): CustomElement[] {
  if (sectionContent === null) return getDefaultSlateValue(section);
  switch (sectionContent.kind) {
    case 'bullets': {
      return sectionContent.value.map((bullet: Bullet) => {
        const thoughts: ThoughtText[] = bullet.T.map((thought: Thought) => {
          return {
            type: 'thought',
            text: thought.txt,
            thoughtType: thought.type,
            lt: thought.lt,
          };
        });
        return {
          type: 'bullet',
          children: thoughts,
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
  const bullets = bulletElems.flatMap((bulletElem: BulletElement) => {
    const thoughts: Thought[] = [];
    bulletElem.children.forEach((t: ThoughtText | EndOfThoughtText) => {
      if (t.type === 'eot') {
        if (thoughts.length > 0) {
          thoughts[thoughts.length - 1].txt =
            thoughts[thoughts.length - 1].txt + t.text;
        }
      } else {
        const txt = t.text.trim();
        if (txt !== '')
          thoughts.push({
            txt,
            lt: t.lt,
            type: t.thoughtType,
          });
      }
    });
    if (thoughts.length === 0) return [];
    return [{ T: thoughts }];
  });
  if (bullets.length === 0) return null; // Indicates a skip!
  return { kind: 'bullets', value: bullets };
}

function parseToTextYBR(ybrTextElems: YBRTextElement[]): SectionContent {
  if (ybrTextElems.length === 0) return null;
  if (ybrTextElems.length > 1)
    throw new Error("Can't have more than one YBRTextElement!");
  const [ybrTextElem] = ybrTextElems;
  const txt = ybrTextElem.children
    .map((t) => {
      return t.text.trim();
    })
    .join('\n');
  if (txt === '') return null;
  return {
    kind: 'ybrtext',
    value: {
      txt,
      ybr: ybrTextElem.ybr,
    },
  };
}

function parseToString(textElems: TextElement[]): SectionContent {
  if (textElems.length === 0) return null;
  const txt = textElems
    .flatMap((textElem) =>
      textElem.children.map((t) => {
        return t.text.trim();
      })
    )
    .join('\n');
  if (txt === '') return null;
  return { kind: 'text', value: txt };
}
