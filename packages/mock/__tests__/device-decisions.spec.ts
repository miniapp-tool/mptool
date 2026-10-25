import { afterEach, describe, expect, it } from "vitest";

import { mockWx, wx } from "../src/index.js";

describe("device decisions", () => {
  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  describe("login / session", () => {
    it("should return the default login code", async () => {
      await expect(wx.login({})).resolves.toMatchObject({ code: "mock-login-code" });
    });

    it("should use the configured login code", async () => {
      mockWx.login({ code: "custom-code" });

      await expect(wx.login({})).resolves.toMatchObject({ code: "custom-code" });
    });

    it("should keep checkSession succeeding by default", async () => {
      await expect(wx.checkSession({})).resolves.toMatchObject({ errMsg: "checkSession:ok" });
    });

    it("should fail checkSession for an expired session", async () => {
      mockWx.login({ code: "expired", sessionValid: false });

      await expect(wx.checkSession({})).rejects.toMatchObject({
        errMsg: "checkSession:fail invalid session",
      });
    });
  });

  describe("user profile", () => {
    it("should succeed by default", async () => {
      await expect(wx.getUserProfile({ desc: "test" })).resolves.toMatchObject({
        errMsg: "getUserProfile:ok",
      });
    });

    it("should fail outside a user gesture", async () => {
      mockWx.user({ gesture: false });

      await expect(wx.getUserProfile({ desc: "test" })).rejects.toMatchObject({
        errMsg: "getUserProfile:fail can only be invoked by user TAP gesture",
      });
    });

    it("should fail when the user denies", async () => {
      mockWx.user({ userInfo: "deny" });

      await expect(wx.getUserProfile({ desc: "test" })).rejects.toMatchObject({
        errMsg: "getUserProfile:fail auth deny",
      });
      await expect(wx.getUserInfo({})).rejects.toMatchObject({
        errMsg: "getUserInfo:fail auth deny",
      });
    });
  });

  describe("payment", () => {
    it("should succeed by default", async () => {
      await expect(wx.requestPayment({})).resolves.toMatchObject({ errMsg: "requestPayment:ok" });
    });

    it("should fail when the user cancels", async () => {
      mockWx.user({ payment: "cancel" });

      await expect(wx.requestPayment({})).rejects.toMatchObject({
        errMsg: "requestPayment:fail cancel",
      });
    });

    it("should fail on payment errors", async () => {
      mockWx.user({ payment: "fail" });

      await expect(wx.requestPayment({})).rejects.toMatchObject({ errMsg: "requestPayment:fail" });
    });
  });

  describe("subscribe messages", () => {
    it("should accept by default", async () => {
      await expect(wx.requestSubscribeMessage({ tmplIds: ["a", "b"] })).resolves.toMatchObject({
        a: "accept",
        b: "accept",
      });
    });

    it("should reject every template when the user rejects", async () => {
      mockWx.user({ subscribe: "reject" });

      await expect(wx.requestSubscribeMessage({ tmplIds: ["a", "b"] })).resolves.toMatchObject({
        a: "reject",
        b: "reject",
      });
    });

    it("should fail when the user cancels", async () => {
      mockWx.user({ subscribe: "cancel" });

      await expect(wx.requestSubscribeMessage({ tmplIds: ["a"] })).rejects.toMatchObject({
        errMsg: "requestSubscribeMessage:fail cancel",
      });
    });
  });
});
