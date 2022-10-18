/* eslint-disable react/display-name */
import { css, cx } from '@emotion/css';
import { Button } from '@mui/material';
import React, { PropsWithChildren, Ref } from 'react';
import ReactDOM from 'react-dom';
import {
  isThoughtSection,
  isYBRSection,
  Section,
  ThoughtType,
} from '../../firebase-app';
import LTButton from './LTButton';
import ThoughtTypeButton from './ThoughtTypeButton';
import { ComposerMode } from './types';
import YBRButton from './YBRButton';

interface BaseProps {
  className: string;
  [key: string]: unknown;
}

export const ToolbarButton = React.forwardRef(
  (
    {
      className,
      active,
      reversed,
      ...props
    }: PropsWithChildren<
      {
        active: boolean;
        reversed: boolean;
        color: string;
        title: string;
      } & BaseProps
    >,
    ref: Ref<HTMLSpanElement> | undefined
  ) => (
    <span
      {...props}
      ref={ref}
      title={props.title}
      className={cx(
        className,
        css`
          border: 1px solid;
          cursor: pointer;
          color: ${reversed
            ? active
              ? 'white'
              : '#aaa'
            : active
            ? props.color
            : '#ccc'};
        `
      )}
    />
  )
);

export const ToolbarIcon = React.forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref: Ref<HTMLSpanElement> | undefined
  ) => (
    <span
      {...props}
      ref={ref}
      className={cx(
        css`
          font-size: 18px;
          vertical-align: text-bottom;
          user-select: none;
        `
      )}
    />
  )
);

export const Menu = React.forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref: Ref<HTMLDivElement> | undefined
  ) => (
    <div
      {...props}
      ref={ref}
      className={cx(
        className,
        css`
          & > * {
            display: inline-block;
          }
          & > * + * {
            margin-left: 15px;
          }
        `
      )}
    />
  )
);

interface PortalProps {
  children: React.ReactNode;
}

export const Portal = ({ children }: PortalProps): React.ReactPortal | null => {
  return typeof document === 'object'
    ? ReactDOM.createPortal(children, document.body)
    : null;
};

const ComposerToolbar = React.forwardRef(
  (
    {
      className,
      ...props
    }: PropsWithChildren<
      {
        mode: ComposerMode;
        section: Section;
        onSubmit: () => void;
        onCanceled: () => void;
        isSubmittable: () => boolean;
      } & BaseProps
    >,
    ref: Ref<HTMLDivElement> | undefined
  ) => {
    if (props.mode === ComposerMode.VIEW) return <></>;

    return (
      <Menu
        ref={ref}
        className={cx(
          className,
          css`
            position: relative;
            padding: 1px 18px 17px;
            margin: 0 -20px;
            margin-top: 20px;
          `
        )}
      >
        {isThoughtSection(props.section) && (
          <>
            <ThoughtTypeButton thoughtType={ThoughtType.Watsonian} />
            <ThoughtTypeButton thoughtType={ThoughtType.Doylist} />
            <ThoughtTypeButton thoughtType={ThoughtType.Meta} />
            <ThoughtTypeButton thoughtType={ThoughtType.Comment} />
            <span> </span>
            <LTButton />
          </>
        )}
        {isYBRSection(props.section) && <YBRButton />}
        {props.mode === ComposerMode.CREATE ? (
          <Button
            style={{ float: 'right' }}
            disabled={!props.isSubmittable()}
            onClick={props.onSubmit}
          >
            Submit
          </Button>
        ) : (
          <div style={{ float: 'right' }}>
            {props.mode === ComposerMode.EDIT && (
              <Button onClick={props.onCanceled}>Cancel</Button>
            )}
            <Button disabled={!props.isSubmittable()} onClick={props.onSubmit}>
              Edit
            </Button>
          </div>
        )}
      </Menu>
    );
  }
);

export default ComposerToolbar;
