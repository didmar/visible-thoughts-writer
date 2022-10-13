import { BaseEditor } from 'slate';
import { HistoryEditor } from 'slate-history';
import { ReactEditor } from 'slate-react';
import { ThoughtType } from '../../firebase-app';

export enum ComposerMode {
  CREATE,
  EDIT,
  VIEW,
}

// Customize slate types with our own Editor, Element and Text types
// (see https://docs.slatejs.org/concepts/12-typescript)

export type CustomEditor = BaseEditor & ReactEditor & HistoryEditor;
export interface BulletElement {
  type: 'bullet';
  children: Array<ThoughtText | EndOfThoughtText>;
}
export interface TextElement {
  type: 'text';
  children: SimpleText[];
}
export interface YBRTextElement {
  type: 'ybrtext';
  ybr: boolean;
  children: SimpleText[];
}
export interface SkippedElement {
  type: 'skipped';
  children: SimpleText[];
}
export type CustomElement =
  | BulletElement
  | TextElement
  | YBRTextElement
  | SkippedElement;

export interface ThoughtText {
  type: 'thought';
  text: string;
  thoughtType: ThoughtType;
  lt: boolean;
}
export interface EndOfThoughtText {
  type: 'eot';
  text: string;
}
export interface SimpleText {
  type: 'text';
  text: string;
}
export type CustomText = ThoughtText | EndOfThoughtText | SimpleText;

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
