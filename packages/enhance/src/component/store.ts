import type { UnknownComponentInstance } from "./typings";

const componentRefs: Record<number, UnknownComponentInstance> = {};

export const getRef = (id: number): UnknownComponentInstance =>
  componentRefs[id];

export const setRef = (id: number, value: UnknownComponentInstance): void => {
  componentRefs[id] = value;
};

export const removeRef = (id: number): void => {
  delete componentRefs[id];
};
