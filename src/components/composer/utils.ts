import {
  Descendant,
  Editor,
  Node,
  NodeEntry,
  Text as SlateText,
  Transforms,
} from 'slate';
import { Bullet, Section, TextYBR, ThoughtType } from '../../firebase-app';
import { toCustomElement } from './parsing';
import { CustomEditor, CustomElement, CustomText, ThoughtText } from './types';

// Wraps all the possible section values with a field that indicates the kind of
// section content. This is a helper to go back and forth between the
// database format and the CustomElement type used by SlateJS.
export type SectionContent =
  | { kind: 'bullets'; value: Bullet[] }
  | { kind: 'ybrtext'; value: TextYBR }
  | { kind: 'text'; value: string }
  | null;

export function getDefaultSectionContent(section: Section): SectionContent {
  switch (section) {
    case Section.InitT:
    case Section.PpptT:
    case Section.PactT:
      return {
        kind: 'bullets',
        value: [
          {
            T: [
              {
                type: ThoughtType.Watsonian,
                txt: '',
                lt: false,
              },
            ],
          },
        ],
      };
    case Section.Ppt:
      return { kind: 'text', value: '' };
    case Section.Act:
    case Section.Out:
      return { kind: 'ybrtext', value: { txt: '', ybr: false } };
  }
}

export function isEmptySectionContent(content: SectionContent): boolean {
  if (content === null) return true;
  switch (content.kind) {
    case 'bullets':
      return content.value.length === 0;
    case 'ybrtext':
      return content.value.txt === '';
    case 'text':
      return content.value === '';
  }
}

export function resetEditor(
  editor: Editor,
  section: Section,
  content?: SectionContent
): void {
  Transforms.delete(editor, {
    at: {
      anchor: Editor.start(editor, []),
      focus: Editor.end(editor, []),
    },
  });
  editor.children =
    content !== undefined
      ? toCustomElement(content, section)
      : getDefaultSlateValue(section);
  // TODO also reset the history
  editor.marks = null;
}

export function getDefaultSlateValue(section: Section): CustomElement[] {
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

export function toSectionContent(
  value: Bullet[] | TextYBR | string | null,
  section: Section
): SectionContent {
  if (value === null) return null;
  switch (section) {
    case Section.InitT:
    case Section.PpptT:
    case Section.PactT:
      return { kind: 'bullets', value: value as Bullet[] };
    case Section.Ppt:
      return { kind: 'text', value: value as string };
    case Section.Act:
    case Section.Out:
      return { kind: 'ybrtext', value: value as TextYBR };
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

export const isLastBulletElementEmpty = (editor: CustomEditor): boolean => {
  const { selection } = editor;
  const at =
    selection !== null
      ? Editor.unhangRange(editor, selection).anchor
      : Editor.end(editor, []);
  const [node] = Editor.node(editor, at) as NodeEntry<CustomText>;
  return node.type === 'thought' && node.text === '';
};
