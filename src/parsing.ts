import { Descendant, Element, Text } from 'slate';
import {
  Bullet,
  Section,
  SectionContent,
  TextYBR,
  ThoughtType,
} from './firebase-app';
import { thoughtTypesMarks } from './components/StepElem';
import { enumKeys, escapeRegExp } from './utils';

export function parse(
  children: Descendant[],
  section: Section
): SectionContent {
  switch (section) {
    case Section.InitT:
      return parseToBullets(children);
    case Section.Ppt:
      return parseToString(children);
    case Section.PpptT:
      return parseToBullets(children);
    case Section.Act:
      return parseToTextYBR(children);
    case Section.PactT:
      return parseToBullets(children);
    case Section.Out:
      return parseToTextYBR(children);
    default:
      throw new Error(`Unknown section: ${Section[section]}`);
  }
}

function parseToBullets(children: Descendant[]): Bullet[] {
  // Each child (a paragraph) is a bullet
  const bullets = children.map((child) => {
    const sentences = (child as Element).children.flatMap((c) => {
      return (c as Text).text
        .split('.')
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence !== '');
    });
    return {
      T: sentences.map((s) => {
        const [type, s2] = parseThoughtTypeMarks(s);
        const [lt, txt] = parseLongTermMarks(s2);
        return { txt, type, lt };
      }),
    };
  });
  return bullets;
}

function parseThoughtTypeMarks(sentence: string): [ThoughtType, string] {
  // If sentence begins and ends with a mark
  for (const key of enumKeys(ThoughtType)) {
    const type = ThoughtType[key];
    const [begMark, endMark] = thoughtTypesMarks[type];
    // FIXME: prebuild the regexps
    if (begMark !== '' && endMark !== '') {
      const re = new RegExp(
        `(.*)${escapeRegExp(begMark)}(.*)${escapeRegExp(endMark)}(.*)`
      );
      // Replace the marks with empty string
      if (re.test(sentence)) {
        return [type, sentence.replace(re, '$1$2$3')];
      }
    }
  }
  return [ThoughtType.Watsonian, sentence];
}

const ltMarksRe = /(.*)\[(.*)\](.*)/;

function parseLongTermMarks(sentence: string): [boolean, string] {
  if (ltMarksRe.test(sentence)) {
    return [true, sentence.replace(ltMarksRe, '$1$2$3')];
  }
  return [false, sentence];
}

function parseToTextYBR(children: Descendant[]): TextYBR {
  // Each child is a paragraph, and each grand child a text
  const texts: string[] = [];
  let ybr = false;
  children.forEach((child) => {
    (child as Element).children.forEach((c) => {
      const text = (c as Text).text.trim();
      if (text !== '') {
        texts.push(text);
        if (text.includes('YBR!')) {
          ybr = true;
        }
      }
    });
  });
  return { txt: texts.join('\n'), ybr };
}

function parseToString(children: Descendant[]): string {
  return parseToTextYBR(children).txt;
}
