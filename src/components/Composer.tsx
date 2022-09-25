import {
  // useState,
  useMemo,
} from 'react';
import { createEditor, Descendant, Element, Text } from 'slate';
import { withReact, Slate, Editable } from 'slate-react';
import { withHistory } from 'slate-history';
import { Bullet, Section, SectionContent, TextYBR } from '../firebase-app';
import { sectionsData } from '../Section';

function parse(children: Descendant[], section: Section): SectionContent {
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
    return { T: sentences.map((s) => ({ txt: s, type: 0, lt: false })) };
  });
  return bullets;
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

interface ComposerProps {
  section: Section;
  onSubmitted: (section: Section, content: SectionContent) => void;
}

const Composer = ({ section, onSubmitted }: ComposerProps): JSX.Element => {
  // const [editor] = useState(() => withReact(withHistory(createEditor())));
  const editor = useMemo(() => withReact(withHistory(createEditor())), []);
  const initialValue = [
    { type: 'paragraph', children: [{ text: Section[section] }] },
  ];

  const icon = sectionsData[section].icon;
  return (
    <>
      {icon}
      <Slate editor={editor} value={initialValue}>
        <Editable
          onKeyDown={(event) => {
            console.log(editor.children);
            if (event.key === 'Enter' && event.ctrlKey) {
              event.preventDefault();
              onSubmitted(section, parse(editor.children, section));
            }
          }}
        />
      </Slate>
    </>
  );
};

export default Composer;
