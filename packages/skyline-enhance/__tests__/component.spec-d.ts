import { assertType, expectTypeOf, it } from "vitest";

import { $Component } from "../src/index.js";

it("$Component", () => {
  expectTypeOf($Component({})).toBeString();

  $Component({
    behaviors: [""],

    props: {
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
        expectTypeOf(err).toMatchTypeOf<Error>();
      },
    },

    pageLifetimes: {
      show() {
        // is current component but not the page
        expectTypeOf(this.data.myProperty).toMatchTypeOf<string>();
        expectTypeOf(this.is).toMatchTypeOf<string>();
      },
    },

    methods: {
      onMyButtonTap() {
        expectTypeOf(this.data.text).toMatchTypeOf<string>();
        expectTypeOf(this.data.min).toMatchTypeOf<number>();

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
        expectTypeOf(newVal).toMatchTypeOf<number>();
        expectTypeOf(oldVal).toMatchTypeOf<number>();
      },
    },
    export() {
      expectTypeOf(this.is).toMatchTypeOf<string>();
      expectTypeOf(this.onMyButtonTap()).toMatchTypeOf<void>();

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

  assertType(
    $Component({
      // @ts-expect-error: custom does not exist on $Component
      custom: 1,
      methods: {
        f() {
          this.custom;
        },
      },
    }),
  );

  assertType(
    $Component({
      data: {
        a: 1,
      },
      methods: {
        someMethod() {
          this.setData({
            // @ts-expect-error: a should be string
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
    props: {
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

        expectTypeOf(channel).toMatchTypeOf<WechatMiniprogram.EventChannel>();
        channel.emit("test", {});
        channel.on("xxx", () => {});
        // @ts-expect-error: emit key should be string
        assertType(channel.emit(1, 2));
      },
    },
  });

  $Component<Record<never, never>, Record<never, never>, { fn(): void }>({
    methods: {
      fn() {
        // @ts-expect-error: notExists
        assertType(this.notExists());
      },
    },
  });

  {
    const data = {
      a: 1,
      b: "",
    };
    const props = {
      c: String,
      d: {
        type: Number,
        value: 4,
      },
    };

    $Component<
      typeof data,
      typeof props,
      /* methods= */ { fn(): string },
      /* customProperties= */ Record<never, never>,
      /* isPage= */ true
    >({
      data,
      props,
      methods: {
        onLoad(q) {
          expectTypeOf(q).toMatchTypeOf<Record<string, string | undefined>>();
        },
        fn() {
          expectTypeOf(this.onShow).toMatchTypeOf<() => void | Promise<void>>();

          // @ts-expect-error: notExists
          assertType(this.notExists);

          return "test";
        },
      },
    });
  }
});
