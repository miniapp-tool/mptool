import { expectTypeOf, it } from "vitest";

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

  const convertType = <T>(_type: T): InferFromType<T> => null as unknown as InferFromType<T>;

  expectTypeOf(convertType(numberConstructor)).toBeNumber();
  expectTypeOf(convertType(stringConstructor)).toBeString();
  expectTypeOf(convertType(booleanConstructor)).toBeBoolean();
  expectTypeOf(convertType(objectConstructor)).toBeObject();
  expectTypeOf(convertType(arrayConstructor)).toBeArray();

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

  const convertOptions = <T>(_type: T): InferPropType<T> => null as unknown as InferPropType<T>;

  expectTypeOf(convertOptions(numberOptions)).toBeNumber();
  expectTypeOf(convertOptions(stringOptions)).toBeString();
  expectTypeOf(convertOptions(booleanOptions)).toBeBoolean();
  expectTypeOf(convertOptions(objectOptions)).toBeObject();
  expectTypeOf(convertOptions(arrayOptions)).toBeArray();
  expectTypeOf(convertOptions(nullOptions)).toBeAny();

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

  expectTypeOf(convertOptionsWithDefault(numberOptionsWithDefault)).toBeNumber();
  expectTypeOf(convertOptionsWithDefault(stringOptionsWithDefault)).toBeString();
  expectTypeOf(convertOptionsWithDefault(booleanOptionsWithDefault)).toBeBoolean();
  expectTypeOf(convertOptionsWithDefault(objectOptionsWithDefault)).toBeObject();
  expectTypeOf(convertOptionsWithDefault(arrayOptionsWithDefault)).toBeArray();
  expectTypeOf(convertOptionsWithDefault(nullOptionsWithDefault)).toBeAny();

  const convertProps = <Props extends PropsOptions>(_props: Props): InferPropTypes<Props> =>
    null as unknown as InferPropTypes<Props>;

  interface Config {
    a: number;
  }

  expectTypeOf(
    convertProps({
      config: {
        type: Object as PropType<Config>,
      },
    }).config,
  ).toEqualTypeOf<Config | undefined>();

  expectTypeOf(
    convertProps({
      myString: String,
      config: {
        type: Object as PropType<Config>,
      },
    }).config,
  ).toEqualTypeOf<Config | undefined>();

  expectTypeOf(
    convertProps({
      myString: String,
      config: {
        type: Object as PropType<Config>,
      },
    }).myString,
  ).toEqualTypeOf<string | undefined>();

  expectTypeOf(
    convertProps({
      myString: String,
      config: {
        type: Object as PropType<Config>,
        default: { a: 1 },
      },
    }).config,
  ).toEqualTypeOf<Config>();

  type Config2 = Config | string[];

  expectTypeOf(
    convertProps({
      myString: String,
      config: {
        type: [Object, Array] as PropType<Config2>,
        default: { a: 1 },
      },
    }).config,
  ).toEqualTypeOf<Config2>();
});
