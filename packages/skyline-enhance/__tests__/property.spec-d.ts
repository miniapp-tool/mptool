import { expectTypeOf, it } from "vitest";

import type { PropType } from "../src";
import { $Component } from "../src";

interface Config {
  a: number;
}

it("$Component property", () => {
  $Component({
    props: {
      config: {
        type: Object as PropType<Config>,
      },
      config2: {
        type: Object as PropType<Config>,
        default: { a: 1 },
      },
    },
    methods: {
      doc() {
        expectTypeOf(this.data.config).toEqualTypeOf<Config | undefined>();
        expectTypeOf(this.data.config2).toEqualTypeOf<Config>();
      },
    },
    options: {
      addGlobalClass: true,
    },
  });

  $Component({
    props: {
      n: Number,
      n2: {
        type: Number,
        default: 1,
      },
      s: String,
      a: Array,
      a2: {
        type: Array,
        default: [1, 2],
      },
      b: Boolean,
      o: Object,
    },
    methods: {
      f() {
        expectTypeOf(this.data.n).toEqualTypeOf<number | undefined>();
        expectTypeOf(this.data.n2).toEqualTypeOf<number>();
        expectTypeOf(this.data.s).toEqualTypeOf<string | undefined>();
        expectTypeOf(this.data.a).toEqualTypeOf<any[] | undefined>();
        expectTypeOf(this.data.a2).toEqualTypeOf<any[]>();
        expectTypeOf(this.data.b).toEqualTypeOf<boolean | undefined>();
        expectTypeOf(this.data.o).toEqualTypeOf<
          Record<string, any> | undefined
        >();
      },
    },
  });

  $Component({
    props: {
      n: Number,
      n2: {
        type: Number,
        default: 1,
      },
      s: String,
      a: Array,
      a2: {
        type: Array,
        default: [1, 2],
      },
      b: Boolean,
      o: Object,
      o2: {
        type: Object,
        default: {} as Record<string, any>,
      },
    },
    methods: {
      g() {
        const str = (1).toFixed(0);

        return str;
      },
      f() {
        expectTypeOf(this.g()).toEqualTypeOf<string>();
        expectTypeOf(this.data.n).toEqualTypeOf<number | undefined>();
        expectTypeOf(this.data.n2).toEqualTypeOf<number>();
        expectTypeOf(this.data.s).toEqualTypeOf<string | undefined>();
        expectTypeOf(this.data.a).toEqualTypeOf<any[] | undefined>();
        expectTypeOf(this.data.a2).toEqualTypeOf<any[]>();
        expectTypeOf(this.data.b).toEqualTypeOf<boolean | undefined>();
        expectTypeOf(this.data.o).toEqualTypeOf<
          Record<string, any> | undefined
        >();
        expectTypeOf(this.data.o2).toEqualTypeOf<Record<string, any>>();
        expectTypeOf(this.data.o2.city).toEqualTypeOf<any>();
      },
    },
  });

  $Component({
    props: {
      n: {
        type: Number,
        default: 1,
      },
      a: {
        type: Array,
        default: [1, 2],
      },
    },
    methods: {
      f() {
        expectTypeOf(this.data.n).toEqualTypeOf<number>();
        expectTypeOf(this.data.a).toEqualTypeOf<any[]>();
      },
    },
  });

  $Component({
    props: {
      n: Number,
      a: Array,
    },
    methods: {
      f() {
        expectTypeOf(this.data.n).toEqualTypeOf<number | undefined>();
        expectTypeOf(this.data.a).toEqualTypeOf<any[] | undefined>();
      },
    },
  });
});
