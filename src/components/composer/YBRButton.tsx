import { css, cx } from '@emotion/css';
import { isHotkey } from 'is-hotkey';
import { KeyboardEvent } from 'react';
import { Editor, Node, NodeEntry, Text as SlateText, Transforms } from 'slate';
import { useSlate } from 'slate-react';
import { ToolbarButton, ToolbarIcon } from './ComposerToolbar';
import {
  CustomEditor,
  CustomElement,
  SimpleText,
  YBRTextElement,
} from './types';

const YBR_HOTKEY = 'mod+1';
const COLOR = 'black';
const TITLE = `Toggle the "yo be real" tag (hotkey: ${YBR_HOTKEY})`;

const YBRButton = (): JSX.Element => {
  const editor = useSlate();
  return (
    <ToolbarButton
      active={isYBRActive(editor)}
      onMouseDown={(event: MouseEvent) => {
        event.preventDefault();
        toggleYBR(editor);
      }}
      color={COLOR}
      title={TITLE}
    >
      <ToolbarIcon>&nbsp;{'YoBeReal'}&nbsp;</ToolbarIcon>
    </ToolbarButton>
  );
};

export const YBRTag = (): JSX.Element => {
  return (
    <span
      title={'Thought with "Yo be real" tag'}
      className={cx(
        css`
          margin: 0;
          position: relative;
          top: 33%;
          border: 1px solid;
          padding: 10px 6px 0px;
          color: ${COLOR};
        `
      )}
    >
      <ToolbarIcon>{'Y'}</ToolbarIcon>
    </span>
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

const toggleYBR = (editor: CustomEditor): void => {
  const isActive = isYBRActive(editor);

  const match = (n: Node): boolean =>
    !Editor.isEditor(n) && Node.isNode(n) && n.type === 'ybrtext';

  const newProperties: Partial<YBRTextElement> = {
    ybr: !isActive,
  };
  Transforms.setNodes<YBRTextElement>(editor, newProperties, { match });
};

export const isYBRActive = (editor: CustomEditor): boolean => {
  if (editor.children.length === 0) return false;
  const node = editor.children[0] as CustomElement;
  return node.type === 'ybrtext' && node.ybr;
};

const ybrRe = /(.*)<yo\s*be\s*real[!]*>(.*)/i;

export const handleYBRTag = (editor: CustomEditor): void => {
  if ((editor.children[0] as CustomElement).type !== 'ybrtext') {
    return;
  }
  const isActive = isYBRActive(editor);
  if (isActive) {
    return;
  }

  const matches: Array<NodeEntry<SimpleText>> = Array.from(
    Editor.nodes(editor, {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateText.isText(n) &&
        n.type === 'text' &&
        ybrRe.test(n.text),
    })
  );

  if (matches.length === 0) {
    return;
  }

  toggleYBR(editor);
};

export default YBRButton;
