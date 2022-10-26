/* eslint-disable react/display-name */
import { css, cx } from '@emotion/css';
import { Box, Button } from '@mui/material';
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
          padding: 8px 0px 0px;
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

    const thoughtSectionButtons = (
      <Box
        sx={{
          justifyContent: 'flex-start',
          alignContent: 'space-between',
          alignSelf: 'center',
          flexShrink: 1,
        }}
      >
        <ThoughtTypeButton thoughtType={ThoughtType.Watsonian} />
        <ThoughtTypeButton thoughtType={ThoughtType.Doylist} />
        <ThoughtTypeButton thoughtType={ThoughtType.Meta} />
        <ThoughtTypeButton thoughtType={ThoughtType.Comment} />
        <Box component="span" sx={{ marginRight: 1 }} />
        <LTButton />
      </Box>
    );

    const spacer = (
      <Box
        sx={{
          flexGrow: 1,
        }}
      />
    );

    const rightsideButtons = (
      <Box
        sx={{
          justifyContent: 'flex-end',
          alignContent: 'space-between',
          alignItems: 'center',
          flexShrink: 1,
        }}
      >
        {props.mode === ComposerMode.CREATE ? (
          <Button disabled={!props.isSubmittable()} onClick={props.onSubmit}>
            Submit
          </Button>
        ) : (
          <>
            {props.mode === ComposerMode.EDIT && (
              <Button onClick={props.onCanceled}>Cancel</Button>
            )}
            <Button disabled={!props.isSubmittable()} onClick={props.onSubmit}>
              Edit
            </Button>
          </>
        )}
      </Box>
    );

    return (
      <Box ref={ref} sx={{ display: 'flex', flexDirection: 'row' }}>
        {isThoughtSection(props.section) && thoughtSectionButtons}
        {isYBRSection(props.section) && (
          <YBRButton editable={props.mode === ComposerMode.CREATE} /> // Can only toggle YBR on create, not when editing
        )}
        {spacer}
        {rightsideButtons}
      </Box>
    );
  }
);

export default ComposerToolbar;
