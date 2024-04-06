/* eslint-disable @typescript-eslint/no-unused-vars */

import { expectType } from "vitest";
import {
  InferFromType,
  InferPropTypes,
  InferPropType,
  PropsOptions,
  PropType,
} from "../../../src/component";

const numberConstructor = Number;
const stringConstructor = String;
const booleanConstructor = Boolean;
const objectConstructor = Object;
const arrayConstructor = Array;

const convertType = <T>(_type: T): InferFromType<T> =>
  null as unknown as InferFromType<T>;

expectType<number>(convertType(numberConstructor));
expectType<string>(convertType(stringConstructor));
expectType<boolean>(convertType(booleanConstructor));
expectType<Record<string, any>>(convertType(objectConstructor));
expectType<any[]>(convertType(arrayConstructor));
expectType<any>(convertType(null));

const numberOptions = {
  type: Number,
};

const stringOptions = {
  type: String,
};

const booleanOptions = {
  type: Boolean,
};

const objectOptions = {
  type: Object,
};

const arrayOptions = {
  type: Array,
};

const nullOptions = {
  type: null,
};

const convertOptions = <T>(_type: T): InferPropType<T> =>
  null as unknown as InferPropType<T>;

expectType<number>(convertOptions(numberOptions));
expectType<string>(convertOptions(stringOptions));
expectType<boolean>(convertOptions(booleanOptions));
expectType<Record<string, any>>(convertOptions(objectOptions));
expectType<any[]>(convertOptions(arrayOptions));
expectType<any>(convertOptions(nullOptions));

const numberOptionsWithDefault = {
  type: Number,
  value: 0,
};

const stringOptionsWithDefault = {
  type: String,
  value: "",
};

const booleanOptionsWithDefault = {
  type: Boolean,
  value: true,
};

const objectOptionsWithDefault = {
  type: Object,
  value: { a: 1 },
};

const arrayOptionsWithDefault = {
  type: Array,
  value: [1],
};

const nullOptionsWithDefault = {
  type: null,
  value: { a: 1 },
};

const convertOptionsWithDefault = <T>(_type: T): InferPropType<T> =>
  null as unknown as InferPropType<T>;

expectType<number>(convertOptionsWithDefault(numberOptionsWithDefault));
expectType<string>(convertOptionsWithDefault(stringOptionsWithDefault));
expectType<boolean>(convertOptionsWithDefault(booleanOptionsWithDefault));
expectType<Record<string, any>>(
  convertOptionsWithDefault(objectOptionsWithDefault),
);
expectType<any[]>(convertOptionsWithDefault(arrayOptionsWithDefault));
expectType<any>(convertOptionsWithDefault(nullOptionsWithDefault));

const convertProps = <Props extends PropsOptions>(
  _props: Props,
): InferPropTypes<Props> => null as unknown as InferPropTypes<Props>;

interface Config {
  a: number;
}

expectType<Config | undefined>(
  convertProps({
    config: {
      type: Object as PropType<Config>,
    },
  }).config,
);

expectType<Config | undefined>(
  convertProps({
    myString: String,
    config: {
      type: Object as PropType<Config>,
    },
  }).config,
);

expectType<string | undefined>(
  convertProps({
    myString: String,
    config: {
      type: Object as PropType<Config>,
    },
  }).myString,
);

expectType<Config>(
  convertProps({
    myString: String,
    config: {
      type: Object as PropType<Config>,
      default: { a: 1 },
    },
  }).config,
);

type Config2 = Config | string[];

expectType<Config2>(
  convertProps({
    myString: String,
    config: {
      type: [Object, Array] as PropType<Config2>,
      default: { a: 1 },
    },
  }).config,
);
