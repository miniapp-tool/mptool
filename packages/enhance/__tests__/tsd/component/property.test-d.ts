import { expectType } from "vitest";
import { $Component, PropType } from "../../../src";

interface Config {
  a: number;
}

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
      expectType<Config | undefined>(this.data.config);
      expectType<Config>(this.data.config2);
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
      expectType<number | undefined>(this.data.n);
      expectType<number>(this.data.n2);
      expectType<string | undefined>(this.data.s);
      expectType<any[] | undefined>(this.data.a);
      expectType<any[]>(this.data.a2);
      expectType<boolean | undefined>(this.data.b);
      expectType<Record<string, any> | undefined>(this.data.o);
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
      expectType<string>(this.g());
      expectType<number | undefined>(this.data.n);
      expectType<number>(this.data.n2);
      expectType<string | undefined>(this.data.s);
      expectType<any[] | undefined>(this.data.a);
      expectType<any[]>(this.data.a2);
      expectType<boolean | undefined>(this.data.b);
      expectType<Record<string, any> | undefined>(this.data.o);
      expectType<Record<string, any>>(this.data.o2);
      expectType<any>(this.data.o2.city);
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
      expectType<number>(this.data.n);
      expectType<any[]>(this.data.a);
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
      expectType<number | undefined>(this.data.n);
      expectType<any[] | undefined>(this.data.a);
    },
  },
});
