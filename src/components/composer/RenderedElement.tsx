import { RenderElementProps } from 'slate-react';

const RenderedElement = ({
  children,
  element,
  attributes,
}: RenderElementProps): JSX.Element => {
  // console.log('children: ', children);
  // console.log('element: ', element);

  switch (element.type) {
    case 'bullet':
      return (
        <li {...attributes}>
          <p>{children}</p>
        </li>
      );
    case 'text':
    case 'ybrtext':
      return <p {...attributes}>{children}</p>;
    default:
      throw new Error('Unknown element type');
  }
};

export default RenderedElement;
