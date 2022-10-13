import { KeyboardEvent } from 'react';
import { Editor, Node, Text as SlateText, Transforms } from 'slate';
import { useSlate } from 'slate-react';
import { ToolbarButton, ToolbarIcon } from './ComposerToolbar';
import { CustomEditor, ThoughtText } from './types';
import { currentOrLastThoughtText } from './utils';
import { isHotkey } from 'is-hotkey';

const LT_HOTKEY = 'mod+5';

const LTButton = (): JSX.Element => {
  const editor = useSlate();
  return (
    <ToolbarButton
      active={isLongTermActive(editor)}
      onMouseDown={(event: MouseEvent) => {
        event.preventDefault();
        toggleLongTerm(editor);
      }}
      color="black"
      title={`Toggle long-term thought (hotkey: ${LT_HOTKEY})`}
    >
      <ToolbarIcon>&nbsp;{'LT'}&nbsp;</ToolbarIcon>
    </ToolbarButton>
  );
};

export const handleLongTermHotkey = (
  editor: CustomEditor,
  event: KeyboardEvent<HTMLDivElement>
): void => {
  if (isHotkey(LT_HOTKEY)(event)) {
    event.preventDefault();
    toggleLongTerm(editor);
  }
};

const toggleLongTerm = (editor: CustomEditor): void => {
  const match = (n: Node): boolean =>
    !Editor.isEditor(n) && SlateText.isText(n) && n.type === 'thought';
  Transforms.unwrapNodes(editor, {
    match,
  });
  const newProperties: Partial<ThoughtText> = {
    lt: !(isLongTermActive(editor) ?? true),
  };
  Transforms.setNodes<ThoughtText>(editor, newProperties, { match });
};

export const isLongTermActive = (editor: CustomEditor): boolean | undefined => {
  const thoughtText = currentOrLastThoughtText(editor);
  return thoughtText?.lt;
};

export default LTButton;
