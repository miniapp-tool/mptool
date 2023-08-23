import type { TrivialComponentInstance } from "./typings.js";

const componentRefs: Record<number, TrivialComponentInstance> = {};

export const getRef = (id: number): TrivialComponentInstance =>
  componentRefs[id];

export const setRef = (id: number, value: TrivialComponentInstance): void => {
  componentRefs[id] = value;
};

export const removeRef = (id: number): void => {
  delete componentRefs[id];
};
