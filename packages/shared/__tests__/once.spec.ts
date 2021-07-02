import "@mptool/mock";
import { once } from "../src";

describe("once", () => {
  it("run once", (done) => {
    let count = 0;
    const fn = once((num: number) => {
      count += 1;
      setTimeout(() => {
        expect(count).toEqual(1);
        expect(num).toEqual(1);
        done();
      }, 20);
    });

    fn(1);
    fn(2);
    fn(3);

    setTimeout(() => {
      expect(count).toEqual(1);
    }, 10);
  });

  it("run once with muti args", (done) => {
    let count = 0;
    const fn = once((x: number, y: number) => {
      count += x + y;
      setTimeout(() => {
        expect(x).toEqual(1);
        expect(y).toEqual(2);
        expect(count).toEqual(3);
        done();
      }, 20);
    });

    fn(1, 2);
    fn(3, 4);
    fn(5, 6);

    setTimeout(() => {
      expect(count).toEqual(3);
    }, 10);
  });
});
