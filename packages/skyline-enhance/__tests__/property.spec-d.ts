import { assertType, it } from "vitest";

import type { PropType } from "../src";
import { $Component } from "../src";

interface Config {
  a: number;
}

it("$Component property", () => {
  $Component({
    properties: {
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
        assertType<Config | undefined>(this.data.config);
        assertType<Config>(this.data.config2);
      },
    },
    options: {
      addGlobalClass: true,
    },
  });

  $Component({
    properties: {
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
        assertType<number | undefined>(this.data.n);
        assertType<number>(this.data.n2);
        assertType<string | undefined>(this.data.s);
        assertType<any[] | undefined>(this.data.a);
        assertType<any[]>(this.data.a2);
        assertType<boolean | undefined>(this.data.b);
        assertType<Record<string, any> | undefined>(this.data.o);
      },
    },
  });

  $Component({
    properties: {
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
        assertType<string>(this.g());
        assertType<number | undefined>(this.data.n);
        assertType<number>(this.data.n2);
        assertType<string | undefined>(this.data.s);
        assertType<any[] | undefined>(this.data.a);
        assertType<any[]>(this.data.a2);
        assertType<boolean | undefined>(this.data.b);
        assertType<Record<string, any> | undefined>(this.data.o);
        assertType<Record<string, any>>(this.data.o2);
        assertType<any>(this.data.o2.city);
      },
    },
  });

  $Component({
    properties: {
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
        assertType<number>(this.data.n);
        assertType<any[]>(this.data.a);
      },
    },
  });

  $Component({
    properties: {
      n: Number,
      a: Array,
    },
    methods: {
      f() {
        assertType<number | undefined>(this.data.n);
        assertType<any[] | undefined>(this.data.a);
      },
    },
  });
});
