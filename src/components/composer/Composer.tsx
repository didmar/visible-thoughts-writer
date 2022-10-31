import EditIcon from '@mui/icons-material/Edit';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import {
  CSSProperties,
  useCallback,
  useEffect,
  // useMemo,
  useState,
} from 'react';
import { createEditor, Editor } from 'slate';
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
} from '../../firebase-app';
import { sectionsData } from '../../Section';
import ComposerToolbar from './ComposerToolbar';
import { handleLongTermHotkey } from './LTButton';
import { parse, toCustomElement } from './parsing';
import RenderedElement from './RenderedElement';
import RenderedLeaf from './RenderedLeaf';
import { handleThoughtTypeHotkeys } from './ThoughtTypeButton';
import { ComposerMode, CustomEditor, CustomElement } from './types';
import {
  getDefaultSectionContent,
  isEmptySectionContent,
  isYBRActive,
  resetEditor,
  SectionContent,
  toSectionContent,
  withCustomization,
} from './utils';
import { handleYBRHotkey, YBRTag } from './YBRButton';

interface ComposerProps {
  initMode: ComposerMode;
  n: number;
  section: Section;
  onSubmitted?: (n: number, content: SectionContent, section: Section) => void;
  initValue?: Bullet[] | TextYBR | string | null;
  editable?: boolean;
  actionHasYBRTag?: boolean;
}

const Composer = ({
  initMode,
  n,
  section,
  onSubmitted,
  initValue,
  editable,
  actionHasYBRTag,
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

  // When section changes for the composer pane used to create sections,
  // reset the editor accordingly (e.g., start from a empty bullet or text)
  useEffect(() => {
    if (mode === ComposerMode.CREATE) {
      console.log('Composer (CREATE) > useEffect [section]: ', section);
      const newContent = getDefaultSectionContent(section);
      setContent(newContent);
      setPreviousContent(newContent);
      resetEditor(editor, section, newContent);
    }
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

    // Initial thoughts, prompt and action can't be empty
    if (
      (section === Section.InitT ||
        section === Section.Ppt ||
        section === Section.Act) &&
      isEmptySectionContent(content)
    )
      return false;

    // Outcomes can't be empty, unless the action has a <yo be real> tag
    if (
      section === Section.Out &&
      isEmptySectionContent(content) &&
      actionHasYBRTag !== true
    )
      return false;

    if (mode === ComposerMode.EDIT && content === null)
      // Skipped sections can't be edited
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
    setContent(previousContent);
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

  const empty = (
    <Box sx={editableStyle}>
      <ul>
        <Typography sx={{ color: 'gray' }}>(empty)</Typography>
      </ul>
    </Box>
  );

  const editableElem = (
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
  );

  return (
    <Box sx={{ flexDirection: 'row', p: 1 }}>
      <Slate
        editor={editor}
        value={toCustomElement(content, section)}
        onChange={(_) => {
          console.log('editor.children: ', JSON.stringify(editor.children));
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
          {mode === ComposerMode.VIEW && content === null
            ? skipped
            : mode === ComposerMode.VIEW && isEmptySectionContent(content)
            ? empty
            : editableElem}
          {editButton}
        </Box>
        <Box sx={{ flexGrowth: 0 }}>{toolbar}</Box>
      </Slate>
    </Box>
  );
};

export default Composer;
