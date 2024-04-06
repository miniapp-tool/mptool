import { expectType, expectError } from "vitest";
import { $Component } from "../../../src/index.js";

expectType<string>($Component({}));

$Component({
  behaviors: [""],

  properties: {
    myProperty: {
      type: String,
      default: "",
    },
    freeType: {
      type: null,
      default: "d",
    },
    myProperty2: String,
    min: {
      type: Number,
      default: 0,
    },
    test: {
      type: String,
      default: "",
    },
    max: {
      type: Number,
      default: 0,
    },
    lastLeaf: {
      type: [String, Object, Number],
      default: 0,
    },
  },

  data: {
    text: "init data",
    array: [{ msg: "1" }, { msg: "2" }],
    logs: [] as string[],
  },

  observers: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "numberA, numberB"(numberA: number, numberB: number) {
      this.setData({
        sum: numberA + numberB,
      });
    },
  },

  lifetimes: {
    created() {},
    attached() {},
    moved() {},
    detached() {},
    error(err) {
      expectType<Error>(err);
    },
  },

  pageLifetimes: {
    show() {
      // is current component but not the page
      expectType<string>(this.data.myProperty);
      expectType<string>(this.is);
    },
  },

  methods: {
    onMyButtonTap() {
      expectType<string>(this.data.text);
      expectType<string>(this.data.min.toFixed());
      this.triggerEvent(
        "tap",
        { a: 1 },
        {
          bubbles: true,
          composed: true,
          capturePhase: true,
        },
      );
    },
    _myPrivateMethod() {
      this.setData({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "A[0].B": "myPrivateData",
      });
    },
    _propertyChange(newVal: number, oldVal: number) {
      expectType<number>(newVal);
      expectType<number>(oldVal);
    },
  },
  export() {
    expectType<string>(this.is);
    expectType<void>(this.onMyButtonTap());
    return {};
  },
});

$Component({
  methods: {
    f() {
      this.triggerEvent("someEvent", {
        a: "test",
        b: 123,
        c: {
          t: "test",
        },
      });
    },
  },
});

expectError(
  $Component({
    custom: 1,
    methods: {
      f() {
        this.custom;
      },
    },
  }),
);

expectError(
  $Component({
    data: {
      a: 1,
    },
    methods: {
      someMethod() {
        this.setData({
          a: "",
        });
      },
    },
  }),
);

$Component({
  options: {
    pureDataPattern: /^_/,
  },
  data: {
    a: true, // 普通数据字段
    _b: true, // 纯数据字段
  },
  methods: {
    myMethod() {
      this.data._b; // 纯数据字段可以在 this.data 中获取
      this.setData({
        c: true, // 普通数据字段
        _d: true, // 纯数据字段
      });
    },
  },
});

$Component({
  properties: {
    a: {
      type: Number,
      // observer: "onAChange",
      value: 1,
    },
  },
  methods: {
    onAChange() {},
  },
});

$Component({
  methods: {
    animate() {
      this.animate(
        "#container",
        [
          { opacity: 1.0, rotate: 0, backgroundColor: "#FF0000" },
          { opacity: 0.5, rotate: 45, backgroundColor: "#00FF00" },
          { opacity: 0.0, rotate: 90, backgroundColor: "#FF0000" },
        ],
        5000,
        () => {
          this.clearAnimation(
            "#container",
            { opacity: true, rotate: true },
            function () {
              console.log("清除了#container上的opacity和rotate属性");
            },
          );
        },
      );

      this.animate(
        ".block",
        [
          { scale: [1, 1], rotate: 0, ease: "ease-out" },
          { scale: [1.5, 1.5], rotate: 45, ease: "ease-in", offset: 0.9 },
          { scale: [2, 2], rotate: 90 },
        ],
        5000,
        () => {
          this.clearAnimation(".block", function () {
            console.log("清除了.block上的所有动画属性");
          });
        },
      );
    },
  },
});

$Component({
  methods: {
    animate() {
      this.animate(
        ".avatar",
        [
          {
            borderRadius: "0",
            borderColor: "red",
            transform: "scale(1) translateY(-20px)",
            offset: 0,
          },
          {
            borderRadius: "25%",
            borderColor: "blue",
            transform: "scale(.65) translateY(-20px)",
            offset: 0.5,
          },
          {
            borderRadius: "50%",
            borderColor: "blue",
            transform: "scale(.3) translateY(-20px)",
            offset: 1,
          },
        ],
        2000,
        {
          scrollSource: "#scroller",
          timeRange: 2000,
          startScrollOffset: 0,
          endScrollOffset: 85,
        },
      );

      this.animate(
        ".search_input",
        [
          {
            opacity: "0",
            width: "0%",
          },
          {
            opacity: "1",
            width: "100%",
          },
        ],
        1000,
        {
          scrollSource: "#scroller",
          timeRange: 1000,
          startScrollOffset: 120,
          endScrollOffset: 252,
        },
      );
    },
  },
});

$Component({
  methods: {
    test() {
      const channel = this.getOpenerEventChannel();
      expectType<WechatMiniprogram.EventChannel>(channel);
      channel.emit("test", {});
      channel.on("xxx", () => {});
      expectError(channel.emit(1, 2));
    },
  },
});

$Component<{}, {}, { fn(): void }>({
  methods: {
    fn() {
      expectError(this.notExists());
    },
  },
});

{
  const data = {
    a: 1,
    b: "",
  };
  const properties = {
    c: String,
    d: {
      type: Number,
      value: 4,
    },
  };
  $Component<
    typeof data,
    typeof properties,
    /* methods= */ { fn(): string },
    /* customProperties= */ {},
    /* isPage= */ true
  >({
    data,
    properties,
    methods: {
      onLoad(q) {
        expectType<string[]>(Object.keys(q));
      },
      fn() {
        expectType<() => void | Promise<void>>(this.onShow);
        expectError(this.notExists);
        return "test";
      },
    },
  });
}
