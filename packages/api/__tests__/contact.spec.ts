import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { addContact } from "../src/index.js";

describe(addContact, () => {
  const mockGetSetting = (authorized: boolean): void => {
    const mockGetSettingApi = wx as unknown as {
      getSetting: (option: {
        success: (result: { authSetting: Record<string, boolean> }) => void;
      }) => void;
    };

    mockGetSettingApi.getSetting = (option): void => {
      option.success({
        authSetting: authorized ? { "scope.addPhoneContact": true } : {},
      });
    };
  };

  const mockAuthorize = (fail = false): void => {
    const mockAuthorizeApi = wx as unknown as {
      authorize: (option: { scope: string; success?: () => void; fail?: () => void }) => void;
    };

    mockAuthorizeApi.authorize = (option): void => {
      if (fail) option.fail?.();
      else option.success?.();
    };
  };

  const mockAddPhoneContact = (): { firstName: string }[] => {
    const calls: { firstName: string }[] = [];
    const mockAddPhoneContactApi = wx as unknown as {
      addPhoneContact: (option: { firstName: string; success?: () => void }) => void;
    };

    mockAddPhoneContactApi.addPhoneContact = (option): void => {
      calls.push({ firstName: option.firstName });
      option.success?.();
    };

    return calls;
  };

  it("should save contact directly when authorized", async () => {
    const calls = mockAddPhoneContact();
    mockGetSetting(true);

    await expect(addContact({ firstName: "test" })).resolves.toBeUndefined();

    expect(calls).toStrictEqual([{ firstName: "test" }]);
  });

  it("should request authorization and save contact", async () => {
    const scopes: string[] = [];
    const mockAuthorizeApi = wx as unknown as {
      authorize: (option: { scope: string; success?: () => void }) => void;
    };

    mockAuthorizeApi.authorize = (option): void => {
      scopes.push(option.scope);
      option.success?.();
    };
    const calls = mockAddPhoneContact();
    mockGetSetting(false);

    await expect(addContact({ firstName: "test" })).resolves.toBeUndefined();

    expect(scopes).toStrictEqual(["scope.addPhoneContact"]);
    expect(calls).toStrictEqual([{ firstName: "test" }]);
  });

  it("should reject when user denies authorization", async () => {
    let modalShown = false;
    const mockShowModalApi = wx as unknown as {
      showModal: (option: {
        title: string;
        success?: (result: { confirm: boolean }) => void;
      }) => void;
    };

    mockShowModalApi.showModal = (option): void => {
      modalShown = true;
      option.success?.({ confirm: true });
    };
    const openCalls: string[] = [];
    const mockOpenSettingApi = wx as unknown as {
      openSetting: (option?: { success?: () => void }) => void;
    };

    mockOpenSettingApi.openSetting = (option): void => {
      openCalls.push("openSetting");
      option?.success?.();
    };
    mockAuthorize(true);
    mockGetSetting(false);

    await expect(addContact({ firstName: "test" })).rejects.toThrow("用户拒绝权限");

    expect(modalShown).toBe(true);
    expect(openCalls).toStrictEqual(["openSetting"]);
  });

  it("should reject when getSetting fails", async () => {
    const mockGetSettingApi = wx as unknown as {
      getSetting: (option: { fail?: (result: { errMsg: string }) => void }) => void;
    };

    mockGetSettingApi.getSetting = (option): void => {
      option.fail?.({ errMsg: "getSetting fail" });
    };

    await expect(addContact({ firstName: "test" })).rejects.toThrow("getSetting fail");
  });

  it("should reject when addPhoneContact fails", async () => {
    const mockAddPhoneContactApi = wx as unknown as {
      addPhoneContact: (option: {
        firstName: string;
        fail?: (result: { errMsg: string }) => void;
      }) => void;
    };

    mockAddPhoneContactApi.addPhoneContact = (option): void => {
      option.fail?.({ errMsg: "addPhoneContact fail" });
    };
    mockGetSetting(true);

    await expect(addContact({ firstName: "test" })).rejects.toThrow("addPhoneContact fail");
  });
});
