/* eslint-disable @typescript-eslint/no-unused-vars */

import { assertType, it } from "vitest";

import type {
  InferFromType,
  InferPropType,
  InferPropTypes,
  PropType,
  PropsOptions,
} from "../src/component";

it("$Component prop infer", () => {
  const numberConstructor = Number;
  const stringConstructor = String;
  const booleanConstructor = Boolean;
  const objectConstructor = Object;
  const arrayConstructor = Array;

  const convertType = <T>(_type: T): InferFromType<T> =>
    null as unknown as InferFromType<T>;

  assertType<number>(convertType(numberConstructor));
  assertType<string>(convertType(stringConstructor));
  assertType<boolean>(convertType(booleanConstructor));
  assertType<Record<string, any>>(convertType(objectConstructor));
  assertType<any[]>(convertType(arrayConstructor));
  assertType<any>(convertType(null));

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

  assertType<number>(convertOptions(numberOptions));
  assertType<string>(convertOptions(stringOptions));
  assertType<boolean>(convertOptions(booleanOptions));
  assertType<Record<string, any>>(convertOptions(objectOptions));
  assertType<any[]>(convertOptions(arrayOptions));
  assertType<any>(convertOptions(nullOptions));

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

  assertType<number>(convertOptionsWithDefault(numberOptionsWithDefault));
  assertType<string>(convertOptionsWithDefault(stringOptionsWithDefault));
  assertType<boolean>(convertOptionsWithDefault(booleanOptionsWithDefault));
  assertType<Record<string, any>>(
    convertOptionsWithDefault(objectOptionsWithDefault),
  );
  assertType<any[]>(convertOptionsWithDefault(arrayOptionsWithDefault));
  assertType<any>(convertOptionsWithDefault(nullOptionsWithDefault));

  const convertProps = <Props extends PropsOptions>(
    _props: Props,
  ): InferPropTypes<Props> => null as unknown as InferPropTypes<Props>;

  interface Config {
    a: number;
  }

  assertType<Config | undefined>(
    convertProps({
      config: {
        type: Object as PropType<Config>,
      },
    }).config,
  );

  assertType<Config | undefined>(
    convertProps({
      myString: String,
      config: {
        type: Object as PropType<Config>,
      },
    }).config,
  );

  assertType<string | undefined>(
    convertProps({
      myString: String,
      config: {
        type: Object as PropType<Config>,
      },
    }).myString,
  );

  assertType<Config>(
    convertProps({
      myString: String,
      config: {
        type: Object as PropType<Config>,
        default: { a: 1 },
      },
    }).config,
  );

  type Config2 = Config | string[];

  assertType<Config2>(
    convertProps({
      myString: String,
      config: {
        type: [Object, Array] as PropType<Config2>,
        default: { a: 1 },
      },
    }).config,
  );
});
