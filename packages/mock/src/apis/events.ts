import { offEvent, onEvent } from "../ui.js";

type EventListener = (...args: unknown[]) => void;

/** Every `onXxx` declared by `miniprogram-api-typings`'s `Wx` interface. */
export const EVENT_ON_APIS = [
  "onAccelerometerChange",
  "onAfterPageLoad",
  "onAfterPageUnload",
  "onApiCategoryChange",
  "onAppHide",
  "onAppRoute",
  "onAppRouteDone",
  "onAppShow",
  "onAudioInterruptionBegin",
  "onAudioInterruptionEnd",
  "onBLECharacteristicValueChange",
  "onBLEConnectionStateChange",
  "onBLEMTUChange",
  "onBLEPeripheralConnectionStateChanged",
  "onBackgroundAudioPause",
  "onBackgroundAudioPlay",
  "onBackgroundAudioStop",
  "onBackgroundFetchData",
  "onBatteryInfoChange",
  "onBeaconServiceChange",
  "onBeaconUpdate",
  "onBeforeAppRoute",
  "onBeforePageLoad",
  "onBeforePageUnload",
  "onBluetoothAdapterStateChange",
  "onBluetoothDeviceFound",
  "onCompassChange",
  "onCopyUrl",
  "onDeviceMotionChange",
  "onEmbeddedMiniProgramHeightChange",
  "onError",
  "onGeneratePoster",
  "onGetWifiList",
  "onGyroscopeChange",
  "onHCEMessage",
  "onKeyDown",
  "onKeyUp",
  "onKeyboardHeightChange",
  "onLazyLoadError",
  "onLocalServiceDiscoveryStop",
  "onLocalServiceFound",
  "onLocalServiceLost",
  "onLocalServiceResolveFail",
  "onLocationChange",
  "onLocationChangeError",
  "onMemoryWarning",
  "onMenuButtonBoundingClientRectWeightChange",
  "onNeedPrivacyAuthorization",
  "onNetworkStatusChange",
  "onNetworkWeakChange",
  "onPageNotFound",
  "onParallelStateChange",
  "onScreenRecordingStateChanged",
  "onSocketClose",
  "onSocketError",
  "onSocketMessage",
  "onSocketOpen",
  "onThemeChange",
  "onUnhandledRejection",
  "onUserCaptureScreen",
  "onUserOffTranslation",
  "onUserTriggerTranslation",
  "onVoIPChatInterrupted",
  "onVoIPChatMembersChanged",
  "onVoIPChatSpeakersChanged",
  "onVoIPChatStateChanged",
  "onVoIPVideoMembersChanged",
  "onWifiConnected",
  "onWifiConnectedWithPartialInfo",
  "onWindowResize",
  "onWindowStateChange",
] as const;

/** Event APIs that also declare a matching `offXxx`. */
export const EVENT_OFF_APIS: Set<string> = new Set<string>([
  "offAccelerometerChange",
  "offAfterPageLoad",
  "offAfterPageUnload",
  "offApiCategoryChange",
  "offAppHide",
  "offAppRoute",
  "offAppRouteDone",
  "offAppShow",
  "offAudioInterruptionBegin",
  "offAudioInterruptionEnd",
  "offBLECharacteristicValueChange",
  "offBLEConnectionStateChange",
  "offBLEMTUChange",
  "offBLEPeripheralConnectionStateChanged",
  "offBatteryInfoChange",
  "offBeaconServiceChange",
  "offBeaconUpdate",
  "offBeforeAppRoute",
  "offBeforePageLoad",
  "offBeforePageUnload",
  "offBluetoothAdapterStateChange",
  "offBluetoothDeviceFound",
  "offCompassChange",
  "offCopyUrl",
  "offDeviceMotionChange",
  "offEmbeddedMiniProgramHeightChange",
  "offError",
  "offGeneratePoster",
  "offGetWifiList",
  "offGyroscopeChange",
  "offHCEMessage",
  "offKeyDown",
  "offKeyUp",
  "offKeyboardHeightChange",
  "offLazyLoadError",
  "offLocalServiceDiscoveryStop",
  "offLocalServiceFound",
  "offLocalServiceLost",
  "offLocalServiceResolveFail",
  "offLocationChange",
  "offLocationChangeError",
  "offMemoryWarning",
  "offMenuButtonBoundingClientRectWeightChange",
  "offNetworkStatusChange",
  "offNetworkWeakChange",
  "offPageNotFound",
  "offParallelStateChange",
  "offScreenRecordingStateChanged",
  "offThemeChange",
  "offUnhandledRejection",
  "offUserCaptureScreen",
  "offUserOffTranslation",
  "offUserTriggerTranslation",
  "offVoIPChatInterrupted",
  "offVoIPChatMembersChanged",
  "offVoIPChatSpeakersChanged",
  "offVoIPChatStateChanged",
  "offVoIPVideoMembersChanged",
  "offWifiConnected",
  "offWifiConnectedWithPartialInfo",
  "offWindowResize",
  "offWindowStateChange",
]);

const ACRONYMS: [string, string][] = [
  ["BLE", "ble"],
  ["HCE", "hce"],
  ["NFC", "nfc"],
  ["SOTER", "soter"],
  ["VoIP", "voip"],
  ["WiFi", "wifi"],
];

/** Canonical event name for an `onXxx` API: the suffix in lowerCamelCase. */
export const eventNameFor = (onName: string): string => {
  let suffix = onName.slice(2);

  for (const [prefix, replacement] of ACRONYMS) {
    if (suffix.startsWith(prefix)) {
      suffix = replacement + suffix.slice(prefix.length);
      break;
    }
  }

  return suffix.charAt(0).toLowerCase() + suffix.slice(1);
};

type EventApi = Record<string, (listener?: EventListener) => void>;

/** Generic `onXxx` / `offXxx` implementation backed by the shared event bus. */
const createEventApi = (): EventApi => {
  const api: EventApi = {};

  for (const onName of EVENT_ON_APIS) {
    const eventName = eventNameFor(onName);

    api[onName] = (listener?: EventListener): void => {
      if (listener) onEvent(eventName, listener);
    };

    const offName = `off${onName.slice(2)}`;

    if (EVENT_OFF_APIS.has(offName)) {
      api[offName] = (listener?: EventListener): void => {
        offEvent(eventName, listener);
      };
    }
  }

  return api;
};

/** All generic event registration APIs. */
export const eventApi: EventApi = createEventApi();
