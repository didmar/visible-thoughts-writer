import { css, cx } from '@emotion/css';
import { Box, Tooltip } from '@mui/material';
import { isHotkey } from 'is-hotkey';
import { KeyboardEvent } from 'react';
import { useSlate } from 'slate-react';
import { ToolbarButton, ToolbarIcon } from './ComposerToolbar';
import { CustomEditor } from './types';
import { isYBRActive, toggleYBR } from './utils';

const YBR_HOTKEY = 'mod+1';
const COLOR = 'black';
const TITLE = `Toggle the "yo be real" tag (hotkey: ${YBR_HOTKEY})`;

const YBRButton = (): JSX.Element => {
  const editor = useSlate();
  return (
    <Box
      sx={{
        justifyContent: 'flex-start',
        alignContent: 'space-between',
        alignSelf: 'center',
        flexShrink: 1,
      }}
    >
      <Tooltip title={TITLE}>
        <ToolbarButton
          active={isYBRActive(editor)}
          onMouseDown={(event: MouseEvent) => {
            event.preventDefault();
            toggleYBR(editor);
          }}
          color={COLOR}
        >
          <ToolbarIcon>&nbsp;{'YoBeReal'}&nbsp;</ToolbarIcon>
        </ToolbarButton>
      </Tooltip>
    </Box>
  );
};

export const YBRTag = (): JSX.Element => {
  return (
    <div>
      <span
        title={'Thought with "Yo be real" tag'}
        className={cx(
          css`
            border: 1px solid;
            padding: 8px 2px 0px;
            color: ${COLOR};
          `
        )}
      >
        <ToolbarIcon>{'YBR'}</ToolbarIcon>
      </span>
    </div>
  );
};

export const handleYBRHotkey = (
  editor: CustomEditor,
  event: KeyboardEvent<HTMLDivElement>
): void => {
  if (isHotkey(YBR_HOTKEY)(event)) {
    event.preventDefault();
    toggleYBR(editor);
  }
};

export default YBRButton;
