import type { TrivialComponentInstance } from "./typings.js";

const componentRefs = new Map<number, TrivialComponentInstance>();

export const getRef = (id: number): TrivialComponentInstance | undefined => componentRefs.get(id);

export const setRef = (id: number, value: TrivialComponentInstance): void => {
  componentRefs.set(id, value);
};

export const removeRef = (id: number): void => {
  componentRefs.delete(id);
};
