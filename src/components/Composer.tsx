import {
  // useState,
  useMemo,
} from 'react';
import { createEditor, Descendant, Element, Text } from 'slate';
import { withReact, Slate, Editable } from 'slate-react';
import { withHistory } from 'slate-history';
import { Bullet, Section } from '../firebase-app';
import { sectionsData } from '../Section';

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

interface ComposerProps {
  section: Section;
  onSubmitted: (bullets: Bullet[]) => void;
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
              onSubmitted(parseToBullets(editor.children));
            }
          }}
        />
      </Slate>
    </>
  );
};

export default Composer;
