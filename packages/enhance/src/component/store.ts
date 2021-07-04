import type { TrivalComponentInstance } from "./typings";

const componentRefs: Record<number, TrivalComponentInstance> = {};

export const getRef = (id: number): TrivalComponentInstance =>
  componentRefs[id];

export const setRef = (id: number, value: TrivalComponentInstance): void => {
  componentRefs[id] = value;
};

export const removeRef = (id: number): void => {
  delete componentRefs[id];
};
