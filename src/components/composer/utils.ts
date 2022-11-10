import {
  Descendant,
  Editor,
  Node,
  NodeEntry,
  Path,
  Text as SlateText,
  Transforms,
} from 'slate';
import {
  Bullet,
  isEmptyBullets,
  Section,
  TextYBR,
  ThoughtType,
} from '../../firebase-app';
import { zipWithPrev } from '../../utils';
import { toCustomElement } from './parsing';
import {
  BulletElement,
  CustomEditor,
  CustomElement,
  CustomText,
  EndOfThoughtText,
  SimpleText,
  ThoughtText,
  YBRTextElement,
} from './types';

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
  // null means "skipped", which if NOT the same as "empty"!
  // (it's a bit confusing because in both case the field will not be exported)
  if (content === null) return false;

  switch (content.kind) {
    case 'bullets':
      return isEmptyBullets(content.value);
    case 'ybrtext':
      return content.value.txt === '';
    case 'text':
      return content.value === '';
  }
}

export function resetEditor(
  editor: Editor,
  section: Section,
  content: SectionContent
): void {
  Transforms.delete(editor, {
    at: {
      anchor: Editor.start(editor, []),
      focus: Editor.end(editor, []),
    },
  });
  editor.children = toCustomElement(content, section);
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

export const currentOrLastThoughtType = (
  editor: CustomEditor
): ThoughtType | undefined => {
  const thoughtText = currentOrLastThoughtText(editor);
  return thoughtText?.thoughtType;
};

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

const endOfBullet = (editor: CustomEditor): boolean => {
  const { selection } = editor;
  if (selection === null) return false;
  const [node] = Editor.node(editor, selection);
  return selection.anchor.offset === Node.string(node).length;
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

const beginsWithEOT = (node: BulletElement): boolean => {
  return node.children[0].type === 'eot';
};

const isEmptyEOT = (node: Node): boolean => {
  return (
    SlateText.isText(node) && node.type === 'eot' && node.text.trim() === ''
  );
};

const hasSiblings = (editor: CustomEditor, path: Path): boolean => {
  return Node.parent(editor, path).children.length > 1;
};

export const mergeAdjacentThoughts = (
  editor: CustomEditor,
  bulletPath: Path
): boolean => {
  // Check if there are two adjacent thoughts without a separator,
  // and merge them if so, using the formatting of the first thought

  let merged = false;

  Editor.withoutNormalizing(editor, () => {
    const childrenWithPath: Array<NodeEntry<Descendant>> = [
      ...Node.children(editor, bulletPath),
    ];
    // console.log('childrenWithPath: ', JSON.stringify(childrenWithPath));
    const withPrev = zipWithPrev(childrenWithPath);
    // Reverse it to scan from the end to the start.
    // Since it merges with the previous thought,
    // this will avoid prevent index errors.
    withPrev.reverse();
    withPrev.forEach(([[node, path], prev]) => {
      if (
        prev !== undefined &&
        prev[0].type === 'thought' &&
        node.type === 'thought' &&
        (prev[0].thoughtType !== node.thoughtType || prev[0].lt !== node.lt)
      ) {
        console.debug(
          `> Merge "${prev[0].text}" with "${
            node.text
          }" (path ${path.toString()})`
        );
        Transforms.mergeNodes(editor, { at: path });
        merged = true;
      }
    });
  });

  return merged;
};

export const mergeTextElements = (editor: CustomEditor): void => {
  console.debug('> merge text elements');
  Editor.withoutNormalizing(editor, () => {
    Transforms.insertText(editor, '\n', { at: Editor.end(editor, [0]) });
    Transforms.mergeNodes(editor, { at: [1] });
  });
};

const eotSeparator = /[.!?]+/g;

export const parseThought = (
  text: string,
  lt: boolean,
  thoughtType: ThoughtType
): Array<ThoughtText | EndOfThoughtText> => {
  const matches = [...text.matchAll(eotSeparator)];
  const customTexts: Array<ThoughtText | EndOfThoughtText> = [];
  let i = 0;
  matches.forEach((match) => {
    if (match.index === undefined)
      throw new Error(
        'Got an undefined index while parsing thoughts from text!'
      );
    if (i < match.index) {
      customTexts.push({
        type: 'thought',
        text: text.slice(i, match.index),
        lt,
        thoughtType,
      });
      i = match.index;
    }
    customTexts.push({
      type: 'eot',
      text: match[0] + ' ', // Add a space for esthetic purpose
    });
    i += match[0].length;
  });
  if (i < text.length || customTexts.length === 0) {
    customTexts.push({
      type: 'thought',
      text: text.slice(i),
      lt,
      thoughtType,
    });
  }
  return customTexts;
};

const createNewThought = (editor: CustomEditor, text: string): ThoughtText => {
  return {
    type: 'thought',
    text,
    lt: isLongTermActive(editor) ?? false,
    thoughtType: currentOrLastThoughtType(editor) ?? ThoughtType.Watsonian,
  };
};

const insertNewBullet = (editor: CustomEditor): void => {
  Transforms.insertNodes(editor, {
    type: 'bullet',
    children: [createNewThought(editor, '')],
  });
};

const fixBulletBeginningWithEOT = (
  editor: CustomEditor,
  node: BulletElement,
  path: Path
): void => {
  Editor.withoutNormalizing(editor, () => {
    console.debug('> Removing eot at beginning of bullet');
    Transforms.removeNodes(editor, { at: [...path, 0] });
    // Was that the only child?
    if (node.children.length === 1) {
      // Insert a thought element at the beginning of the bullet,
      // so that the bullet is not empty!
      console.debug('> Inserting empty thought at beginning of bullet');
      Transforms.insertNodes(editor, createNewThought(editor, ''), {
        at: [...path, 0],
      });
      // Cursor is still at the end of previous bullet,
      // move it to the beginning of the new bullet
      Transforms.move(editor, { distance: 1, unit: 'character' });
    }
  });
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

export const toggleYBR = (editor: CustomEditor): void => {
  const isActive = isYBRActive(editor);

  const match = (n: Node): boolean =>
    !Editor.isEditor(n) && Node.isNode(n) && n.type === 'ybrtext';

  const newProperties: Partial<YBRTextElement> = {
    ybr: !isActive,
  };
  Transforms.setNodes<YBRTextElement>(editor, newProperties, { match });
};

export const toggleLongTerm = (editor: CustomEditor): void => {
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

export const withCustomization = (editor: CustomEditor): CustomEditor => {
  const { insertText, insertBreak, normalizeNode } = editor;

  // There are a few cases that need to be handled,
  // in order to keep our data model consistent.
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;
    console.debug(`@ normalizeNode path=[${path.toString()}]:`, node);

    if (isEmptyEOT(node) && hasSiblings(editor, path)) {
      console.debug('> Removing empty eot');
      Transforms.removeNodes(editor, { at: path });
      return;
    } else if (Editor.isBlock(editor, node) && node.type === 'bullet') {
      if (beginsWithEOT(node)) {
        fixBulletBeginningWithEOT(editor, node, path);
        return;
      } else {
        const merged = mergeAdjacentThoughts(editor, path);
        // Return only if some merged happened.
        // Once all the merging is done, we want to continue
        // with the rest of the normalization.
        if (merged) return;
      }
    } else if (path.length === 0) {
      // When copy/pasting, multiple text elements may be created,
      // so merge them into one if so.
      const children = (node as CustomEditor).children;
      if (
        (children[0].type === 'ybrtext' || children[0].type === 'text') &&
        children.length > 1
      ) {
        mergeTextElements(editor);
        return;
      }
    }

    console.debug('> standard normalizeNode');
    normalizeNode(entry);
  };

  editor.insertBreak = () => {
    console.debug('@ insertBreak');
    if ((editor.children[0] as CustomElement).type !== 'bullet') {
      // For TextElement and YBRTextElement,
      // a new line does not create a new element
      // but is put into the SimpleText child
      Transforms.insertText(editor, '\n');
    } else {
      // If BulletElement, new line will create a new BulletElement,
      // unless the current BulletElement is empty
      if (!isLastBulletElementEmpty(editor)) {
        if (endOfBullet(editor)) {
          console.debug('> Inserting new bullet at the end of current bullet');
          insertNewBullet(editor);
        } else {
          insertBreak();
        }
      }
    }
  };

  editor.insertSoftBreak = () => {
    console.debug('@ insertSoftBreak');
    Transforms.insertText(editor, '\n');
  };

  editor.insertText = (text) => {
    console.debug('@ insertText: ', text);
    // Are we in a thought section?
    if ((editor.children[0] as CustomElement).type === 'bullet') {
      // Parse the text for eot separators
      const lt = isLongTermActive(editor) ?? false;
      const thoughtType =
        currentOrLastThoughtType(editor) ?? ThoughtType.Watsonian;
      const elements = parseThought(text, lt, thoughtType);
      Transforms.insertNodes(editor, elements);
    } else {
      // If not a thought section, use the standard behavior
      insertText(text);
      // Check if a "<yo be real>" was typed and apply it if so
      handleYBRTag(editor);
    }
  };

  return editor;
};
