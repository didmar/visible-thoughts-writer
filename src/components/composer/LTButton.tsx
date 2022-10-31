import { Tooltip } from '@mui/material';
import { isHotkey } from 'is-hotkey';
import { KeyboardEvent } from 'react';
import { useSlate } from 'slate-react';
import { ToolbarButton, ToolbarIcon } from './ComposerToolbar';
import { CustomEditor } from './types';
import { isLongTermActive, toggleLongTerm } from './utils';

const LT_HOTKEY = 'mod+5';

const LTButton = (): JSX.Element => {
  const editor = useSlate();
  return (
    <Tooltip title={`Toggle long-term thought (hotkey: ${LT_HOTKEY})`}>
      <ToolbarButton
        active={isLongTermActive(editor)}
        onMouseDown={(event: MouseEvent) => {
          event.preventDefault();
          toggleLongTerm(editor);
        }}
        color="black"
      >
        <ToolbarIcon>&nbsp;{'LT'}&nbsp;</ToolbarIcon>
      </ToolbarButton>
    </Tooltip>
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

export default LTButton;
