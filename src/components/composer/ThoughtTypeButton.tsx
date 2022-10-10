import { isHotkey } from 'is-hotkey';
import { KeyboardEvent } from 'react';
import { Transforms } from 'slate';
import { useSlate } from 'slate-react';
import { ThoughtType } from '../../firebase-app';
import { arraysContainsArray } from '../../utils';
import { ToolbarButton, ToolbarIcon } from './ComposerToolbar';
import { THOUGHT_TYPE_COLORS } from './RenderedLeaf';
import { CustomEditor, ThoughtText } from './types';
import {
  currentOrLastThoughtText,
  currentOrLastThoughtTextEntries,
} from './utils';

const THOUGHT_TYPE_HOTKEYS: Record<string, ThoughtType> = {
  'mod+1': ThoughtType.Watsonian,
  'mod+2': ThoughtType.Doylist,
  'mod+3': ThoughtType.Meta,
  'mod+4': ThoughtType.Comment,
};

const THOUGHT_TYPE_ICONS: Record<ThoughtType, string> = {
  [ThoughtType.Watsonian]: 'W',
  [ThoughtType.Doylist]: 'D',
  [ThoughtType.Meta]: 'M',
  [ThoughtType.Comment]: 'C',
};

interface ThoughtTypeButtonProps {
  thoughtType: ThoughtType;
}

const ThoughtTypeButton = ({
  thoughtType,
}: ThoughtTypeButtonProps): JSX.Element => {
  const editor = useSlate();
  return (
    <ToolbarButton
      active={isThoughtTypeActive(editor, thoughtType)}
      onMouseDown={(event: MouseEvent) => {
        event.preventDefault();
        toggleThoughtType(editor, thoughtType);
      }}
      color={THOUGHT_TYPE_COLORS[thoughtType]}
      title={`${thoughtType} thought (hotkey: ${THOUGHT_TYPE_HOTKEYS[thoughtType]})`}
    >
      <ToolbarIcon>&nbsp;{THOUGHT_TYPE_ICONS[thoughtType]}&nbsp;</ToolbarIcon>
    </ToolbarButton>
  );
};

export const handleThoughtTypeHotkeys = (
  editor: CustomEditor,
  event: KeyboardEvent<HTMLDivElement>
): void => {
  for (const hotkey in THOUGHT_TYPE_HOTKEYS) {
    if (isHotkey(hotkey)(event)) {
      event.preventDefault();
      const thoughtType = THOUGHT_TYPE_HOTKEYS[hotkey];
      toggleThoughtType(editor, thoughtType);
    }
  }
};

const toggleThoughtType = (
  editor: CustomEditor,
  thoughtType: ThoughtType
): void => {
  const newProperties: Partial<ThoughtText> = {
    thoughtType,
  };
  // Get the paths of all the selected blocks, or the previous block
  // if there are no selected blocks.
  const thoughtTextEntries = currentOrLastThoughtTextEntries(editor);
  const thoughtTextPaths = thoughtTextEntries.map(([_, p]) => p);
  // Apply the new properties to all the matched nodes.
  Transforms.setNodes<ThoughtText>(editor, newProperties, {
    match: (_, p) => arraysContainsArray(thoughtTextPaths, p),
  });
};

const isThoughtTypeActive = (
  editor: CustomEditor,
  thoughtType: ThoughtType
): boolean => {
  return currentOrLastThoughtType(editor) === thoughtType;
};

export const currentOrLastThoughtType = (
  editor: CustomEditor
): ThoughtType | undefined => {
  const thoughtText = currentOrLastThoughtText(editor);
  return thoughtText?.thoughtType;
};

export default ThoughtTypeButton;
