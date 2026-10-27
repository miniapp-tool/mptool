---
title: "@mptool/api"
icon: puzzle-piece
---

Common API wrappers for mini-programs.

<!-- more -->

## clipboard

### writeClipboard

- Type: `(data?: string) => Promise<void>`

- Parameters:
  - `data`: the content to write to the clipboard

Writes content to the clipboard.

## contact

### addContact

- Type: `(config: Omit<WechatMiniprogram.AddPhoneContactOption, "success" | "fail" | "complete">) => Promise<void>`

- Parameters:
  - `config`: contact information configuration

Saves a contact to the address book.

### getCurrentPage

- Type: `<T extends Record<string, any>>() => (T & WechatMiniprogram.Page.TrivialInstance) | null`

Gets the current page instance.

### getCurrentRoute

- Type: `() => string`

Gets the current page path.

## compareVersion

### compareVersion

- Type: `(versionA: string, versionB: string) => number`

- Notes: a version number must consist of non-negative integer segments (such as `1.2.0`); a non-numeric segment (such as `1.0.0-beta`) throws a `TypeError`, preventing a `NaN` comparison from silently treating the versions as equal.

- Parameters:
  - `versionA`: version A
  - `versionB`: version B

- Returns:
  - `1`: versionA > versionB
  - `0`: versionA = versionB
  - `-1`: versionA < versionB

Compares two version numbers.

## media

### openDocument

- Type: `(url: string) => void`

- Parameters:
  - `url`: the online document URL

Opens and previews a document (it is downloaded first, then opened).

### saveDocument

- Type: `(url: string, filename?: string) => void`

- Parameters:
  - `url`: the online document URL
  - `filename`: the file name to save (optional, extracted from the URL by default)

Downloads and saves a document to WeChat Favorites.

### savePhoto

- Type: `(imgPath: string) => Promise<void>`

- Parameters:
  - `imgPath`: the image path

Saves an image to the photo album (permission is requested automatically).

## network

### download

- Type: `(url: string, mask?: boolean) => Promise<string>`

- Parameters:
  - `url`: the download URL
  - `mask`: whether to show a loading mask

Downloads a file and returns the temporary file path.

### reportNetworkStatus

- Type: `() => void`

Detects the network status and shows a prompt.

## ui

### showModal

- Type: `(title: string, content: string, confirmAction?: () => void | Promise<void>, cancelAction?: () => void | Promise<void>, failAction?: () => void | Promise<void>) => void`

- Parameters:
  - `title`: the modal title
  - `content`: the modal content
  - `confirmAction`: the callback when Confirm is tapped
  - `cancelAction`: the callback when Cancel is tapped (the Cancel button is not shown when omitted)
  - `failAction`: the callback when the modal fails to open (falls back to `cancelAction` when omitted)

Shows a modal dialog.

### showToast

- Type: `(title: string, duration?: number, icon?: "success" | "error" | "loading" | "none") => Promise<void>`

- Parameters:
  - `title`: the toast text
  - `duration`: the duration (defaults to 1500ms)
  - `icon`: the icon type

Shows a toast.

### confirm

- Type: `(text: string, confirmAction: () => Promise<void> | void, warning?: string, cancelAction?: () => void | Promise<void>) => void`

- Parameters:
  - `text`: the action description
  - `confirmAction`: the confirm callback
  - `warning`: additional warning information (optional)
  - `cancelAction`: the cancel callback (optional)

Shows an action confirmation dialog.

### retry

- Type: `(title: string, content: string, retryAction: () => void | Promise<void>, navigateBack?: boolean) => void`

- Parameters:
  - `title`: the modal title
  - `content`: the modal content
  - `retryAction`: the retry callback
  - `navigateBack`: whether to go back to the previous page after the retry fails

Shows a retry dialog.

### getWindowInfo

- Type: `() => WechatMiniprogram.WindowInfo`

Gets window information.

## update

### updateApp

- Type: `(onUpdateReady: (applyUpdate: () => void) => Promise<void> | void) => void`

- Parameters:
  - `onUpdateReady`: the callback when an update is detected; it receives an `applyUpdate` function for applying the update

Checks for mini-program updates and handles the upgrade flow.
