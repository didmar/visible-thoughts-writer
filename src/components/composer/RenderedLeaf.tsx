import { RenderLeafProps } from 'slate-react';
import { ThoughtType } from '../../firebase-app';
import { withoutUndefinedValues } from '../../utils';

const RenderedLeaf = ({
  children,
  leaf,
  attributes,
}: RenderLeafProps): JSX.Element => {
  switch (leaf.type) {
    case 'thought': {
      const { thoughtType, lt } = leaf;
      const style = withoutUndefinedValues({
        fontWeight: thoughtType === ThoughtType.Meta ? 'bold' : undefined,
        fontStyle: thoughtType === ThoughtType.Doylist ? 'italic' : undefined,
        fontFamily:
          thoughtType === ThoughtType.Comment ? 'monospace' : undefined,
        textDecoration: lt ? 'underline' : undefined,
        color: THOUGHT_TYPE_COLORS[thoughtType],
      });
      return (
        <span {...attributes} style={style}>
          {children}
        </span>
      );
    }
    case 'eot':
    case 'text':
      return <span {...attributes}>{children}</span>;
    default:
      throw new Error('Unknown leaf type');
  }
};

export const THOUGHT_TYPE_COLORS = {
  [ThoughtType.Watsonian]: 'purple',
  [ThoughtType.Doylist]: 'red',
  [ThoughtType.Meta]: 'green',
  [ThoughtType.Comment]: 'blue',
};

export default RenderedLeaf;
