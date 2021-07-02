import "@mptool/mock";
import { lock } from "../src";

describe("lock", () => {
  it("run once", (done) => {
    let count = 0;

    const fn = lock((release) => {
      count += 1;
      setTimeout(() => {
        expect(count).toEqual(1);
        release();
        done();
      }, 10);
    });

    fn();
    fn();
  });

  it("reuse", (done) => {
    const fn = lock((release, callbackFunc?: any) => {
      setTimeout(() => {
        release();
        if (callbackFunc) callbackFunc();
      }, 10);
    });

    fn();
    fn(() => {
      expect(false).toEqual("The function should be locked");
    });
    setTimeout(() => {
      fn(() => {
        done();
      });
    }, 10);
  });
});
