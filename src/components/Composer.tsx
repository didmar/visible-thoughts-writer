import {
  // useState,
  useMemo,
} from 'react';
import { createEditor } from 'slate';
import { withReact, Slate, Editable } from 'slate-react';
import { withHistory } from 'slate-history';
import { Section, SectionContent } from '../firebase-app';
import { sectionsData } from '../Section';
import { parse } from '../parsing';

interface ComposerProps {
  section: Section;
  onSubmitted: (section: Section, content: SectionContent) => void;
}

const Composer = ({ section, onSubmitted }: ComposerProps): JSX.Element => {
  // const [editor] = useState(() => withReact(withHistory(createEditor())));
  const editor = useMemo(() => withReact(withHistory(createEditor())), []);
  const initialValue = [
    { type: 'paragraph', children: [{ text: Section[section].toString() }] },
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
