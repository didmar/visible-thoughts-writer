import EditIcon from '@mui/icons-material/Edit';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import {
  CSSProperties,
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
  Bullet,
  isThoughtSection,
  isYBRSection,
  Section,
  TextYBR,
  ThoughtType,
} from '../../firebase-app';
import { sectionsData } from '../../Section';
import ComposerToolbar from './ComposerToolbar';
import { handleLongTermHotkey, isLongTermActive } from './LTButton';
import { parse, toCustomElement } from './parsing';
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
  getDefaultSectionContent,
  isEmptySectionContent,
  isLastBulletElementEmpty,
  resetEditor,
  SectionContent,
  toSectionContent,
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
  onSubmitted?: (n: number, content: SectionContent, section: Section) => void;
  initValue?: Bullet[] | TextYBR | string | null;
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
  const initContent =
    initValue !== undefined
      ? toSectionContent(initValue, section)
      : getDefaultSectionContent(section);

  // const editor = useMemo(() => withCustomization(withReact(withHistory(createEditor()))), []);
  const [editor] = useState<CustomEditor>(() =>
    withCustomization(withReact(withHistory(createEditor())))
  );
  const [mode, setMode] = useState<ComposerMode>(initMode);
  // Section content based on the current state of the editor (gets updated on every change)
  const [content, setContent] = useState<SectionContent>(initContent);
  // Section content from last successful submit (to revert if cancelling)
  const [previousContent, setPreviousContent] =
    useState<SectionContent>(initContent);

  // When section changes, reset the editor with the proper content
  useEffect(() => {
    console.log('Composer > useEffect [section]');
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

  const isSubmittable = (): boolean => {
    if (content === undefined) return false;
    // Can't submit if we are only viewing the section
    if (mode === ComposerMode.VIEW) return false;

    // Action can never be edited after submission,
    // nor can it be skipped or left empty
    if (
      section === Section.Act &&
      (mode === ComposerMode.EDIT || isEmptySectionContent(content))
    )
      return false;

    // Can't edit a section with YBR flag into
    // a skipped section
    if (
      mode === ComposerMode.EDIT &&
      isYBRSection(section) &&
      isEmptySectionContent(content)
    )
      return false;

    // Anything else is OK
    return true;
  };

  const submit = (): void => {
    if (!isSubmittable()) return;

    // Call callback function to update in the database
    onSubmitted?.(n, content, section);

    // Update last successful submit with current content
    setPreviousContent(content);

    // After editing, go back to view mode
    if (mode === ComposerMode.EDIT) {
      setMode(ComposerMode.VIEW);
    }
  };

  const cancel = (): void => {
    // Reset editor to last successful submit
    resetEditor(editor, section, previousContent);
    // Go back to view mode
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

  // Yo be real mark displayed below thought type icon, when in view mode
  const ybrTag = mode === ComposerMode.VIEW &&
    isYBRSection(section) &&
    isYBRActive(editor) && <YBRTag />;

  const editableStyle: CSSProperties =
    mode !== ComposerMode.VIEW
      ? {
          border: '1px solid gray',
          borderRadius: '5px',
          flexGrow: 1,
          overflow: 'auto',
        }
      : {
          flexGrow: 1,
          overflow: 'auto',
        };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (mode === ComposerMode.VIEW) return;
    // Submit hotkey pressed?
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      submit();
      return;
    }
    // Handle other hotkeys
    if (isThoughtSection(section)) {
      handleThoughtTypeHotkeys(editor, event);
      handleLongTermHotkey(editor, event);
    } else if (isYBRSection(section)) {
      handleYBRHotkey(editor, event);
    }
  };

  const editButton = mode === ComposerMode.VIEW && (editable ?? false) && (
    <Box sx={{ alignSelf: 'start' }}>
      <Tooltip title="Edit section">
        <IconButton
          aria-label="edit"
          onClick={() => setMode(ComposerMode.EDIT)}
        >
          <EditIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const toolbar = mode !== ComposerMode.VIEW && (
    <ComposerToolbar
      mode={mode}
      section={section}
      onSubmit={submit}
      onCanceled={cancel}
      isSubmittable={isSubmittable}
    />
  );

  const skipped = (
    <Box sx={editableStyle}>
      <ul>
        <Typography sx={{ color: 'gray' }}>(skipped)</Typography>
      </ul>
    </Box>
  );

  return (
    <Box sx={{ flexDirection: 'row', p: 1 }}>
      <Slate
        editor={editor}
        value={toCustomElement(initContent, section)}
        onChange={(_) => {
          // console.log('editor.children: ', JSON.stringify(editor.children));
          setContent(parse(editor.children as CustomElement[]));
          // console.log('content: ', JSON.stringify(content));
        }}
      >
        <Box display="flex">
          <Box
            sx={{
              flexDirection: 'column',
              flexShrink: 1,
              mt: 1,
              mr: 1,
            }}
          >
            {icon}
            {ybrTag}
          </Box>
          {mode === ComposerMode.VIEW && content === null ? (
            skipped
          ) : (
            <Editable
              readOnly={mode === ComposerMode.VIEW}
              onDOMBeforeInput={
                mode !== ComposerMode.VIEW ? handleDOMBeforeInput : undefined
              }
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              style={editableStyle}
              onKeyDown={onKeyDown}
              autoFocus={mode !== ComposerMode.VIEW}
            />
          )}
          {editButton}
        </Box>
        <Box sx={{ flexGrowth: 0 }}>{toolbar}</Box>
      </Slate>
    </Box>
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
