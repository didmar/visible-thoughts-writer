import {
  // useState,
  useMemo,
} from 'react';
import { createEditor, Transforms, Editor } from 'slate';
import { withReact, Slate, Editable } from 'slate-react';
import { withHistory } from 'slate-history';
import { Section, SectionContent } from '../firebase-app';
import { sectionsData } from '../Section';
import { parse } from '../parsing';
import { Button, Grid } from '@mui/material';

function clearEditor(editor: Editor): void {
  Transforms.delete(editor, {
    at: {
      anchor: Editor.start(editor, []),
      focus: Editor.end(editor, []),
    },
  });
}

interface ComposerProps {
  section: Section;
  onSubmitted: (section: Section, content: SectionContent) => void;
}

const Composer = ({ section, onSubmitted }: ComposerProps): JSX.Element => {
  // const [editor] = useState(() => withReact(withHistory(createEditor())));
  const editor = useMemo(() => withReact(withHistory(createEditor())), []);
  const initialValue = [{ type: 'paragraph', children: [{ text: '' }] }];

  const submit = (): void => {
    onSubmitted(section, parse(editor.children, section));
    clearEditor(editor);
  };

  const icon = sectionsData[section].icon;
  return (
    <>
      <Grid container spacing={0}>
        <Grid item xs={1} md={1} lg={1}>
          {icon}
        </Grid>
        <Grid item xs={11} md={11} lg={11}>
          <Slate editor={editor} value={initialValue}>
            <Editable
              style={{
                border: '1px solid gray',
                borderRadius: '5px',
                padding: 5,
                overflow: 'auto',
              }}
              onKeyDown={(event) => {
                // console.log(editor.children);
                if (event.key === 'Enter' && event.ctrlKey) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <Button style={{ float: 'right' }} onClick={submit}>
              Submit
            </Button>
          </Slate>
        </Grid>
      </Grid>
    </>
  );
};

export default Composer;
