import { expectType } from "tsd";
import { $Component } from "../../../src";

interface Config {
  a: number;
}

interface ConfigConstructor extends ObjectConstructor {
  new (value?: any): Config;
  readonly prototype: Config;
}

$Component({
  properties: {
    config: {
      type: Object as ConfigConstructor,
    },
  },
  methods: {
    doc() {
      expectType<Record<string, any>>(this.data.config);
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
      value: 1,
    },
    s: String,
    a: Array,
    a2: {
      type: Array,
      value: [1, 2],
    },
    b: Boolean,
    o: Object,
  },
  methods: {
    f() {
      expectType<number>(this.data.n);
      expectType<number>(this.data.n2);
      expectType<string>(this.data.s);
      expectType<any[]>(this.data.a);
      expectType<any[]>(this.data.a2);
      expectType<boolean>(this.data.b);
      expectType<Record<string, any>>(this.data.o);
      expectType<any>(this.data.a[0]);
      expectType<any>(this.data.o.prop);
    },
  },
});

$Component({
  properties: {
    n: Number,
    n2: {
      type: Number,
      value: 1,
    },
    s: String,
    a: Array,
    a2: {
      type: Array,
      value: [1, 2],
    },
    b: Boolean,
    o: Object,
    o2: {
      type: Object,
      value: {} as Record<string, any>,
    },
  },
  methods: {
    g() {
      const str = (1).toFixed(0);
      return str;
    },
    f() {
      expectType<string>(this.g());
      expectType<number>(this.data.n);
      expectType<number>(this.data.n2);
      expectType<string>(this.data.s);
      expectType<any[]>(this.data.a);
      expectType<any[]>(this.data.a2);
      expectType<boolean>(this.data.b);
      expectType<Record<string, any>>(this.data.o);
      expectType<Record<string, any>>(this.data.o2);
      expectType<any>(this.data.o2.city);
      expectType<any>(this.data.a[0]);
      expectType<any>(this.data.o.prop);
    },
  },
});

$Component({
  properties: {
    n: {
      type: Number,
      value: 1,
    },
    a: {
      type: Array,
      value: [1, 2],
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
      expectType<number>(this.data.n);
      expectType<any[]>(this.data.a);
    },
  },
});
