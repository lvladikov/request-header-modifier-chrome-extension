# Request Headers (including CORS) Modifier

## Description

The Request Headers (including CORS) Modifier is a Chrome extension designed to modify HTTP request headers, primarily for development purposes. It allows you to add or modify headers, enabling you to bypass CORS restrictions, test different configurations, and debug web applications more efficiently. In addition to using the extension from the Chrome Extensions bar, it also has its API exposed to the global window (via `window.requestHeaderModifier`), thus allowing use on demand and in an automated way, either from the console or from sideloaded scripts such as Tampermonkey!

## Features

- **Request Header Modification:** Add or modify request headers.

- **CORS Bypass:** Easily bypass CORS restrictions by setting the necessary request headers.

- **Enable/Disable:** Toggle the extension on or off with a single click.

- **Enable/Disable via API:** Toggle the extension on or off by running API methods exposed to the global object (see [API Usage](#api-usage) section).

- **Hostname Management via API:** Programmatically add, remove, or clear target hostnames.

- **Header Management via API:** Programmatically add, remove, or clear custom request headers.

- **Persistent Settings:** Settings are saved and restored across browser sessions.

- **Simple UI:** Easy-to-use popup interface for managing hostnames and headers.

## Preview

![Screenshot](screenshot.png)

## Installation

1. Download the project files.

2. Open Chrome and navigate to `chrome://extensions`.

3. Enable "Developer mode" in the top right corner.

4. Click "Load unpacked" and select the directory containing the extension files (where `manifest.json` is located).

### Troubleshooting Caching Issues After Updates

If you've previously installed a version of this extension, updated the extension files but the new features or fixes don't seem to be working, you might be encountering a caching issue within Chrome. Follow these steps to ensure all updated scripts are loaded:

1.  **Open Chrome Extensions:** Navigate to `chrome://extensions` in your browser.
2.  **Locate the Extension:** Find the "Request Headers (including CORS) Modifier" extension.
3.  **Toggle Off and On:** Click the toggle switch for the extension to turn it **OFF**, then wait for a few seconds (e.g., 5-10 seconds) to ensure the service worker fully stops. After that, click the toggle switch again to turn it **ON**. This is more effective than just clicking the "Reload" button for clearing service worker caches.
4.  **Hard Refresh Web Page:** Go to the web page where you are using or testing the extension's functionality. Perform a "hard refresh" of the page:
    - **Windows/Linux:** Press `Ctrl + Shift + R`
    - **macOS:** Press `Cmd + Shift + R`
      This will clear the browser's cache for that specific page and force it to load the latest versions of the injected content scripts (`content-script.js`, `main.js`).
5.  **Check Console Logs:** Open the browser's developer console (F12 or `Cmd + Option + I`) on the web page, and if you're debugging service worker interactions, open the service worker's console by clicking the "service worker" link under your extension on `chrome://extensions`. Look for the `console.log` messages from `main.js`, `content-script.js`, and `service-worker.js` to confirm the correct message flow.

## Web Interface Usage

1. Click the extension icon in the Chrome toolbar to open the popup.

2. Enter the target hostnames (one per line) in the "Target Hostnames" field. These are the domains for which the headers will be modified.

3. Enter the request headers you want to add or modify in the "Request Headers to Add/Modify" field. Use the format `Header-Name: Header-Value` for each header, with each header on a new line.

4. Click "Apply Rules" to save and apply the header modifications.

5. Click "Clear & Disable" to remove all settings and disable the extension.

6. Use the toggle switch to quickly enable or disable the extension.

7. Click "CORS Preset" to pre-fill the Request Headers with common CORS headers.

---

## API Usage

The extension exposes a global API object `window.requestHeaderModifier` that allows you to control its functionality programmatically from your browser's developer console, a website's script (if allowed by CSP), or user script managers like Tampermonkey. All API methods return a Promise that resolves to a boolean indicating success (`true`) or failure (`false`).

### `window.requestHeaderModifier.enable()`

Enables the header modification functionality. This will apply the currently saved rules.

```javascript
await window.requestHeaderModifier.enable(); // Returns true on success
```

### `window.requestHeaderModifier.disable()`

Disables the header modification functionality. This will clear all active rules.

```javascript
await window.requestHeaderModifier.disable(); // Returns true on success
```

### `window.requestHeaderModifier.addHostname(hostname)`

Adds a new hostname to the list of target hostnames. If the hostname already exists, no change is made.

- `hostname` (string): The hostname to add (e.g., `"api.example.com"`).

```javascript
await window.requestHeaderModifier.addHostname("newapi.domain.com"); // Adds "newapi.domain.com"
await window.requestHeaderModifier.addHostname("api.another.net"); // Adds "api.another.net"
```

### `window.requestHeaderModifier.addHostnames(hostnames)`

Adds multiple hostnames to the list of target hostnames. Duplicate hostnames will be ignored.

- `hostnames` (string[]): An array of hostnames to add (e.g., `["app.domain.com", "app.example.com"]`).

```javascript
await window.requestHeaderModifier.addHostnames([
  "api.test.com",
  "localhost:3000",
]);
// Returns true on success
```

### `window.requestHeaderModifier.removeHostname(hostname)`

Removes a specific hostname from the list of target hostnames.

- `hostname` (string): The hostname to remove.

```javascript
await window.requestHeaderModifier.removeHostname("newapi.domain.com"); // Removes "newapi.domain.com"
```

### `window.requestHeaderModifier.removeHostnames(hostnames)`

Removes multiple hostnames from the list of target hostnames. Hostnames not found will be ignored.

- `hostnames` (string[]): An array of hostnames to remove.

```javascript
await window.requestHeaderModifier.removeHostnames([
  "api.old.com",
  "dev.api.net",
]);
// Returns true if any hostnames were removed, false otherwise
```

### `window.requestHeaderModifier.clearHostnames()`

Clears all hostnames from the list, effectively disabling header modification for all domains until new hostnames are added.

```javascript
await window.requestHeaderModifier.clearHostnames(); // Clears all hostnames
```

### `window.requestHeaderModifier.addHeader(header)`

Adds a new custom request header or updates an existing one if a header with the same name already exists.

- `header` (string | object): The header to add.
  - **String format:** `"Header-Name: Header-Value"` (e.g., `"X-Custom-Auth: mytoken123"`)
  - **Object format:** `{ "headerName": "headerValue" }` (e.g., `{ "X-Client-ID": "app-123" }`)

```javascript
// Using string format
await window.requestHeaderModifier.addHeader("X-My-Header: MyValue");

// Using object format
await window.requestHeaderModifier.addHeader({
  "Content-Type": "application/json",
});

// Updating an existing header (will overwrite "MyValue" with "NewValue")
await window.requestHeaderModifier.addHeader("X-My-Header: NewValue");
```

### `window.requestHeaderModifier.addHeaders(headers)`

Adds multiple request headers to the list. If headers with the same names exist, their values will be updated.

- `headers` ((string | object)[]): An array of headers to add. Each element can be a string like `"Header-Name: Header-Value"` or an object like `{ "headerName": "headerValue" }`.

```javascript
// Using string format array
await window.requestHeaderModifier.addHeaders([
  "X-My-Header: Value1",
  "Y-My-Header: Value2",
]);

// Using object format array
await window.requestHeaderModifier.addHeaders([
  { "Content-Type": "application/json" },
  { "Accept-Language": "en-US" },
]);

// Mixing formats and updating existing
await window.requestHeaderModifier.addHeaders([
  "Cache-Control: no-cache",
  { "X-My-Header": "UpdatedValue" }, // This will update X-My-Header if it exists
]);
// Returns true on success
```

### `window.requestHeaderModifier.removeHeader(header)`

Removes a specific custom request header by its name. The value part of the input is ignored for removal.

- `header` (string | object): The header to remove. Only the header name is considered for removal.
  - **String format:** `"Header-Name: AnyValue"` (e.g., `"X-My-Header: ignored"`)
  - **Object format:** `{ "headerName": "ignoredValue" }` (e.g., `{ "Content-Type": "ignored" }`)

```javascript
// Using string format
await window.requestHeaderModifier.removeHeader("X-My-Header: something"); // Removes X-My-Header

// Using object format
await window.requestHeaderModifier.removeHeader({ "Content-Type": "whatever" }); // Removes Content-Type
```

### `window.requestHeaderModifier.removeHeaders(headers)`

Removes multiple request headers from the list. Only the header name is considered for removal. Headers not found will be ignored.

- `headers` ((string | object)[]): An array of headers to remove. Each element can be a string like `"Header-Name: AnyValue"` or an object like `{ "headerName": "ignoredValue" }`.

```javascript
// Using string format array
await window.requestHeaderModifier.removeHeaders([
  "X-Old-Header: anything",
  "Another-Header",
]);

// Using object format array
await window.requestHeaderModifier.removeHeaders([
  { Authorization: "some-token" },
  { Accept: "application/xml" },
]);
// Returns true if any headers were removed, false otherwise
```

### `window.requestHeaderModifier.clearHeaders()`

Clears all custom request headers from the list.

```javascript
await window.requestHeaderModifier.clearHeaders(); // Clears all custom headers
```

---

## How it Works

The extension uses Chrome's [declarativeNetRequest API](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/) to modify headers. Here's a breakdown of the key components:

- **`manifest.json`:** Declares the extension's metadata, permissions, and content scripts.

- **`popup.html`:** The HTML structure for the extension's popup interface.

- **`popup.js`:** Handles user interactions in the popup, saves settings to Chrome storage, and communicates with the service worker. It also updates its UI dynamically when API calls modify settings.

- **`service-worker.js`:** (Background Script) Listens for events, manages the extension's state, and applies/removes header modification rules using the `declarativeNetRequest` API. It now also processes API calls for hostname and header management.

- **`content-script.js`:** Injected into web pages to act as a secure bridge. It injects `main.js` into the page's main world and relays messages between `main.js` and `service-worker.js`.

- **`main.js`:** Injected into the web page and exposes `window.requestHeaderModifier` to enable/disable and manage hostnames/headers from the page's context.

---

## Files

- `manifest.json`: Extension manifest file.

- `popup.html`: Popup HTML file.

- `popup.js`: Popup JavaScript file.

- `service-worker.js`: Service worker script.

- `content-script.js`: Content script to inject `main.js`.

- `main.js`: Script injected into the web page.

- `icons/`: Directory containing the extension icons.

---

## Permissions

The extension requires the following permissions:

- `declarativeNetRequest`: To modify HTTP headers.

- `storage`: To store settings.

- `activeTab`: To access the currently active tab.

- `host_permissions`: `<all_urls>`: To modify headers for all URLs.

---

## Disclaimer

This extension is designed for development purposes only. Modifying headers can have unintended consequences, and it should not be used in a production environment.

---

## License

[MIT](LICENSE)
