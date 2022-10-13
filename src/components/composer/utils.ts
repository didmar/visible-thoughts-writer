import {
  Descendant,
  Editor,
  Node,
  Text as SlateText,
  Transforms,
  NodeEntry,
} from 'slate';
import { Section, ThoughtType } from '../../firebase-app';
import { CustomEditor, CustomElement, ThoughtText } from './types';

export function resetEditor(
  editor: Editor,
  section: Section,
  initValue?: CustomElement[]
): void {
  Transforms.delete(editor, {
    at: {
      anchor: Editor.start(editor, []),
      focus: Editor.end(editor, []),
    },
  });
  editor.children = initValue ?? getInitialValue(section);
  // TODO also reset the history
  editor.marks = null;
}

export function getInitialValue(section: Section): Descendant[] {
  switch (section) {
    case Section.InitT:
      return structuredClone(initialBulletElements);
    case Section.Ppt:
      return structuredClone(initialTextElements);
    case Section.PpptT:
      return structuredClone(initialBulletElements);
    case Section.Act:
      return structuredClone(initialYBRTextElements);
    case Section.PactT:
      return structuredClone(initialBulletElements);
    case Section.Out:
      return structuredClone(initialYBRTextElements);
    default:
      throw new Error(`Unknown section: ${Section[section]}`);
  }
}

const initThoughtText: ThoughtText = {
  type: 'thought',
  text: '',
  thoughtType: ThoughtType.Watsonian,
  lt: false,
};

const initialBulletElements: Descendant[] = [
  {
    type: 'bullet',
    children: [initThoughtText],
    //   children: [
    //     {
    //       type: 'thought',
    //       text: 'This is watsonian',
    //       thoughtType: ThoughtType.Watsonian,
    //       lt: false,
    //     },
    //     {
    //       type: 'eot',
    //       text: '.',
    //     },
    //     {
    //       type: 'thought',
    //       text: 'This is doylist',
    //       thoughtType: ThoughtType.Doylist,
    //       lt: false,
    //     },
    //     {
    //       type: 'eot',
    //       text: '.',
    //     },
    //     {
    //       type: 'thought',
    //       text: 'This is meta',
    //       thoughtType: ThoughtType.Meta,
    //       lt: false,
    //     },
    //     {
    //       type: 'eot',
    //       text: '.',
    //     },
    //     {
    //       type: 'thought',
    //       text: 'This is comment',
    //       thoughtType: ThoughtType.Comment,
    //       lt: false,
    //     },
    //     {
    //       type: 'eot',
    //       text: '.',
    //     },
    //     {
    //       type: 'thought',
    //       text: 'This is meta and long-term',
    //       thoughtType: ThoughtType.Meta,
    //       lt: true,
    //     },
    //   ],
  },
];

const initialTextElements: Descendant[] = [
  {
    type: 'text',
    children: [{ type: 'text', text: '' }],
  },
];

const initialYBRTextElements: Descendant[] = [
  {
    type: 'ybrtext',
    ybr: false,
    children: [{ type: 'text', text: '' }],
  },
];

// const LIST_TYPES: string[] = ['bulleted-list'];

export const currentOrLastThoughtText = (
  editor: CustomEditor
): ThoughtText | undefined => {
  const thoughtTextEntries = currentOrLastThoughtTextEntries(editor);
  if (thoughtTextEntries.length === 0) {
    return undefined;
  }
  const [thoughtText] = thoughtTextEntries[thoughtTextEntries.length - 1];
  return thoughtText;
};

export const currentOrLastThoughtTextEntries = (
  editor: CustomEditor
): Array<NodeEntry<ThoughtText>> => {
  const { selection } = editor;
  if (selection === null) return [];

  // Get ThoughtText nodes within the selection
  const nodes: Array<NodeEntry<ThoughtText>> = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: isThoughtTextNode,
    })
  );
  if (nodes.length > 0) {
    return nodes;
  }

  // If no ThoughtText selected, find the last one before the selection
  const previous: NodeEntry<ThoughtText> | undefined = Editor.previous(editor, {
    at: selection,
    match: isThoughtTextNode,
  });

  return previous !== undefined ? [previous] : [];
};

const isThoughtTextNode = (n: Node): boolean =>
  !Editor.isEditor(n) && SlateText.isText(n) && n.type === 'thought';

export const beginningOfBullet = (editor: CustomEditor): boolean => {
  const { selection } = editor;
  if (selection === null) return false;
  return selection.anchor.offset === 0;
};
