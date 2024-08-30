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
        expectTypeOf(this.data.config).toMatchTypeOf<Config | undefined>();
        expectTypeOf(this.data.config2).toMatchTypeOf<Config>();
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
        expectTypeOf(this.data.n).toMatchTypeOf<number | undefined>();
        expectTypeOf(this.data.n2).toMatchTypeOf<number>();
        expectTypeOf(this.data.s).toMatchTypeOf<string | undefined>();
        expectTypeOf(this.data.a).toMatchTypeOf<any[] | undefined>();
        expectTypeOf(this.data.a2).toMatchTypeOf<any[]>();
        expectTypeOf(this.data.b).toMatchTypeOf<boolean | undefined>();
        expectTypeOf(this.data.o).toMatchTypeOf<
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
        expectTypeOf(this.g()).toMatchTypeOf<string>();
        expectTypeOf(this.data.n).toMatchTypeOf<number | undefined>();
        expectTypeOf(this.data.n2).toMatchTypeOf<number>();
        expectTypeOf(this.data.s).toMatchTypeOf<string | undefined>();
        expectTypeOf(this.data.a).toMatchTypeOf<any[] | undefined>();
        expectTypeOf(this.data.a2).toMatchTypeOf<any[]>();
        expectTypeOf(this.data.b).toMatchTypeOf<boolean | undefined>();
        expectTypeOf(this.data.o).toMatchTypeOf<
          Record<string, any> | undefined
        >();
        expectTypeOf(this.data.o2).toMatchTypeOf<Record<string, any>>();
        expectTypeOf(this.data.o2.city).toMatchTypeOf<any>();
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
        expectTypeOf(this.data.n).toMatchTypeOf<number>();
        expectTypeOf(this.data.a).toMatchTypeOf<any[]>();
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
        expectTypeOf(this.data.n).toMatchTypeOf<number | undefined>();
        expectTypeOf(this.data.a).toMatchTypeOf<any[] | undefined>();
      },
    },
  });
});
