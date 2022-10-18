import EditIcon from '@mui/icons-material/Edit';
import { Grid, IconButton } from '@mui/material';
import {
  useCallback,
  useEffect,
  // useMemo,
  useState,
} from 'react';
import { createEditor, Editor, Transforms } from 'slate';
import { withHistory } from 'slate-history';
import {
  Editable,
  ReactEditor,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  withReact,
} from 'slate-react';
import {
  isThoughtSection,
  isYBRSection,
  Section,
  SectionContent,
  ThoughtType,
} from '../../firebase-app';
import { sectionsData } from '../../Section';
import ComposerToolbar from './ComposerToolbar';
import { handleLongTermHotkey, isLongTermActive } from './LTButton';
import { parse } from './parsing';
import RenderedElement from './RenderedElement';
import RenderedLeaf from './RenderedLeaf';
import {
  currentOrLastThoughtType,
  handleThoughtTypeHotkeys,
} from './ThoughtTypeButton';
import {
  ComposerMode,
  CustomEditor,
  CustomElement,
  EndOfThoughtText,
  ThoughtText,
} from './types';
import {
  beginningOfBullet,
  getInitialValue,
  isLastBulletElementEmpty,
  resetEditor,
} from './utils';
import {
  handleYBRHotkey,
  handleYBRTag,
  isYBRActive,
  YBRTag,
} from './YBRButton';

interface ComposerProps {
  initMode: ComposerMode;
  n: number;
  section: Section;
  onSubmitted?: (n: number, section: Section, content: SectionContent) => void;
  initValue?: CustomElement[];
  editable?: boolean;
}

const Composer = ({
  initMode,
  n,
  section,
  onSubmitted,
  initValue,
  editable,
}: ComposerProps): JSX.Element => {
  const [mode, setMode] = useState<ComposerMode>(initMode);

  useEffect(() => {
    console.log('=== useEffect ===');
    setMode(initMode);
    if (mode === ComposerMode.CREATE) resetEditor(editor, section);
  }, [section]);

  const renderElement = useCallback(
    (props: RenderElementProps) => (
      <ul>
        <RenderedElement {...props} />
      </ul>
    ),
    []
  );
  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <RenderedLeaf {...props} />,
    []
  );

  // const editor = useMemo(() => withCustomization(withReact(withHistory(createEditor()))), []);
  const [editor] = useState<CustomEditor>(() =>
    withCustomization(withReact(withHistory(createEditor())))
  );

  const [content, setContent] = useState<SectionContent>(null);

  const isSubmittable = (): boolean => {
    return !(content === null && mode === ComposerMode.EDIT);
  };

  const submit = (): void => {
    // const content = parse(editor.children as CustomElement[]);

    onSubmitted?.(n, section, content);

    // After editing, go back to view mode
    if (mode === ComposerMode.EDIT) setMode(ComposerMode.VIEW);
  };

  const cancel = (): void => {
    resetEditor(editor, section, initValue);
    setMode(ComposerMode.VIEW);
  };

  const handleDOMBeforeInput = useCallback((_: InputEvent) => {
    queueMicrotask(() => {
      const pendingDiffs = ReactEditor.androidPendingDiffs(editor);

      const scheduleFlush: boolean =
        pendingDiffs?.some(({ diff, path }) => {
          console.log('diff: ', diff);
          console.log('path: ', path);

          if (!diff.text.endsWith(' ')) {
            return false;
          }

          // const { text } = SlateNode.leaf(editor, path);
          // const beforeText = text.slice(0, diff.start) + diff.text.slice(0, -1);
          // if (!(beforeText in SHORTCUTS)) {
          //   return false;
          // }

          const blockEntry = Editor.above(editor, {
            at: path,
            match: (n) => Editor.isBlock(editor, n),
          });
          if (blockEntry === undefined) {
            return false;
          }

          const [, blockPath] = blockEntry;
          return Editor.isStart(editor, Editor.start(editor, path), blockPath);
        }) ?? false;

      if (scheduleFlush) {
        ReactEditor.androidScheduleFlush(editor);
      }
    });
  }, []);

  const icon = sectionsData[section].icon;

  return (
    <>
      <Grid container spacing={0}>
        <Grid item xs={1} md={1} lg={1} sx={{ padding: 1 }}>
          {icon}
        </Grid>
        <Grid item xs={11} md={11} lg={11}>
          <Slate
            editor={editor}
            value={
              initValue !== undefined ? initValue : getInitialValue(section)
            }
            onChange={(_) => {
              // console.log('editor.children: ', JSON.stringify(editor.children));
              setContent(parse(editor.children as CustomElement[]));
              // console.log('content: ', JSON.stringify(content));
            }}
          >
            <Grid container spacing={0}>
              <Grid item xs={11} md={11} lg={11}>
                <Editable
                  readOnly={mode === ComposerMode.VIEW}
                  onDOMBeforeInput={
                    mode !== ComposerMode.VIEW
                      ? handleDOMBeforeInput
                      : undefined
                  }
                  renderElement={renderElement}
                  renderLeaf={renderLeaf}
                  style={
                    mode !== ComposerMode.VIEW
                      ? {
                          border: '1px solid gray',
                          borderRadius: '5px',
                          padding: 5,
                          overflow: 'auto',
                        }
                      : {}
                  }
                  onKeyDown={(event) => {
                    if (mode === ComposerMode.VIEW) return;
                    if (event.key === 'Enter' && event.ctrlKey) {
                      event.preventDefault();
                      submit();
                      return;
                    }
                    if (isThoughtSection(section)) {
                      handleThoughtTypeHotkeys(editor, event);
                      handleLongTermHotkey(editor, event);
                    } else if (isYBRSection(section)) {
                      handleYBRHotkey(editor, event);
                    }
                  }}
                  autoFocus={mode !== ComposerMode.VIEW}
                />
              </Grid>
              <Grid item xs={1} md={1} lg={1}>
                {mode === ComposerMode.VIEW &&
                  isYBRSection(section) &&
                  isYBRActive(editor) && <YBRTag />}
                {mode === ComposerMode.VIEW && (editable ?? false) && (
                  <IconButton
                    aria-label="edit"
                    onClick={() => setMode(ComposerMode.EDIT)}
                  >
                    <EditIcon />
                  </IconButton>
                )}
              </Grid>
            </Grid>
            {mode !== ComposerMode.VIEW && (
              <ComposerToolbar
                mode={mode}
                section={section}
                onSubmit={submit}
                onCanceled={cancel}
                isSubmittable={isSubmittable}
              />
            )}
          </Slate>
        </Grid>
      </Grid>
    </>
  );
};

// Customized editor methods

const withCustomization = (editor: CustomEditor): CustomEditor => {
  const { insertText, insertBreak } = editor;

  editor.insertBreak = () => {
    if ((editor.children[0] as CustomElement).type !== 'bullet') {
      // For TextElement and YBRTextElement,
      // a new line does not create a new element
      // but is put into the SimpleText child
      Transforms.insertText(editor, '\n');
    } else {
      // If BulletElement, new line will create a new BulletElement,
      // unless the current BulletElement is empty
      if (!isLastBulletElementEmpty(editor)) {
        insertBreak();
      }
    }
  };

  editor.insertSoftBreak = () => {
    Transforms.insertText(editor, '\n');
  };

  editor.insertText = (text) => {
    if ((editor.children[0] as CustomElement).type === 'bullet') {
      if (text === '.' || text === '!' || text === '?') {
        // Check that we are not starting a new bullet
        if (!beginningOfBullet(editor)) {
          const eott: EndOfThoughtText = {
            type: 'eot',
            text,
          };
          Transforms.insertNodes(editor, eott);
        }
      } else {
        const newThought: ThoughtText = {
          type: 'thought',
          text,
          lt: isLongTermActive(editor) ?? false,
          thoughtType:
            currentOrLastThoughtType(editor) ?? ThoughtType.Watsonian,
        };
        Transforms.insertNodes(editor, newThought);
      }
    } else {
      // If not a thought section, use the standard behavior
      insertText(text);
      // Check if a "<yo be real>" was typed and apply it if so
      handleYBRTag(editor);
    }
  };

  return editor;
};

export default Composer;
