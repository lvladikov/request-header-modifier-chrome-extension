// Constants
const RULE_ID_MODIFY_HEADERS = 1;
const BADGE_ON = { text: "ON", color: "#046604" }; // Green
const BADGE_OFF = { text: "OFF", color: "#a70606" }; // Red

// Initialization
chrome.runtime.onInstalled.addListener(() => {
  // On first install, set the state to disabled.
  chrome.storage.local.set({ isEnabled: false }, () => {
    // Explicitly update badge here after setting isEnabled
    chrome.action.setBadgeText({ text: BADGE_OFF.text });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_OFF.color });
  });
  // Apply any rules that might have been saved in sync storage previously.
  applyRulesFromStorage();
});

chrome.runtime.onStartup.addListener(() => {
  // When the browser starts, re-apply rules if the extension is enabled.
  applyRulesFromStorage();
});

// Main State Change Listener
// This listener automatically reacts to any change in the `isEnabled` flag.
chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.isEnabled) {
    const isEnabled = changes.isEnabled.newValue;
    if (isEnabled) {
      // If toggled ON, re-apply the last saved rules.
      applyRulesFromStorage();
      chrome.action.setBadgeText({ text: BADGE_ON.text });
      chrome.action.setBadgeBackgroundColor({ color: BADGE_ON.color });
    } else {
      // If toggled OFF, clear all active rules.
      clearAllRules();
      chrome.action.setBadgeText({ text: BADGE_OFF.text });
      chrome.action.setBadgeBackgroundColor({ color: BADGE_OFF.color });
    }
  }
});

// Main Action: Toggle on/off by clicking the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  // Get the current state and flip it. The onChanged listener above will handle the rest.
  const { isEnabled } = await chrome.storage.local.get("isEnabled");
  chrome.storage.local.set({ isEnabled: !isEnabled });
});

// Rule Management Functions
const applyRulesFromStorage = async () => {
  // Only apply rules if the extension is enabled.
  const { isEnabled } = await chrome.storage.local.get({ isEnabled: true });

  // Always update the badge based on the current `isEnabled` state here
  if (isEnabled) {
    chrome.action.setBadgeText({ text: BADGE_ON.text });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_ON.color });
  } else {
    chrome.action.setBadgeText({ text: BADGE_OFF.text });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_OFF.color });
  }

  if (!isEnabled) {
    await clearAllRules();
    return;
  }

  const { hostnames, requestHeaders } = await chrome.storage.sync.get([
    "hostnames",
    "requestHeaders",
  ]);
  if (hostnames) {
    // Only update rules if there are hostnames specified
    await updateRules(hostnames, requestHeaders || "");
  } else {
    await clearAllRules(); // Clear rules if no hostnames are set
  }
};

const updateRules = async (hostnamesStr, headersStr) => {
  const domains = hostnamesStr
    .split("\n")
    .map((h) => h.trim())
    .filter(Boolean);

  // Parse custom request headers
  const requestHeadersToAdd = headersStr
    .split("\n")
    .map((line) => {
      const parts = line.split(":");
      return parts.length >= 2 // Ensure there's at least a name and some value
        ? {
            header: parts[0].trim(),
            operation: "set",
            value: parts.slice(1).join(":").trim(),
          }
        : null;
    })
    .filter(Boolean);

  // Define default CORS response headers
  const corsResponseHeaders = [
    { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
    {
      header: "Access-Control-Allow-Methods",
      operation: "set",
      value: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    },
    {
      header: "Access-Control-Allow-Headers",
      operation: "set",
      value: "*",
    },
  ];

  if (domains.length === 0 && requestHeadersToAdd.length === 0) {
    await clearAllRules(); // If no domains and no custom headers, clear rules
    return;
  }

  const newRule = {
    id: RULE_ID_MODIFY_HEADERS,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: requestHeadersToAdd,
      responseHeaders: corsResponseHeaders, // Always include CORS response headers
    },
    condition: {
      domains: domains,
      resourceTypes: [
        "main_frame",
        "sub_frame",
        "xmlhttprequest",
        "ping",
        "csp_report",
        "media",
        "websocket",
        "other",
      ],
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID_MODIFY_HEADERS],
    addRules: [newRule],
  });
  console.log(`Rules updated for: ${domains.join(", ")}`);
};

const clearAllRules = async () => {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const ids = existingRules.map((rule) => rule.id);
  if (ids.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ids,
    });
    console.log("All dynamic rules cleared.");
  }
};

// Message Listener for communication from the popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    console.log(
      `service-worker.js: Received message. Type: '${request.type}', Method: '${request.method}', Payload:`,
      request.payload
    ); // Added logging
    let success = false;
    let data = null;

    if (request.type === "updateRules") {
      // Triggered by popup save button
      await applyRulesFromStorage();
      success = true;
    } else if (request.type === "apiCall") {
      // This is the expected message type from content-script.js
      // API calls from content script
      const { method, payload } = request;

      switch (
        method // This switch handles the specific API methods
      ) {
        case "toggleExtension":
          await chrome.storage.local.set({ isEnabled: payload.isEnabled });
          success = true;
          data = { isEnabled: payload.isEnabled };
          break;

        case "addHostname":
          const currentHostnames =
            (await chrome.storage.sync.get("hostnames")).hostnames || "";
          let hostnameArray = currentHostnames
            .split("\n")
            .map((h) => h.trim())
            .filter(Boolean);
          const newHostname = payload.hostname;
          if (!hostnameArray.includes(newHostname)) {
            hostnameArray.push(newHostname);
            const updatedHostnames = hostnameArray.join("\n");
            await chrome.storage.sync.set({ hostnames: updatedHostnames });
            await applyRulesFromStorage();
            success = true;
          } else {
            console.log(`Hostname '${newHostname}' already exists.`);
            success = false; // Indicate no change if already present
          }
          break;

        case "addMultipleHostnames":
          const currentHostnamesMulti =
            (await chrome.storage.sync.get("hostnames")).hostnames || "";
          let hostnameArrayMulti = currentHostnamesMulti
            .split("\n")
            .map((h) => h.trim())
            .filter(Boolean);
          let changedHostnames = false;
          payload.hostnames.forEach((newHostname) => {
            if (!hostnameArrayMulti.includes(newHostname)) {
              hostnameArrayMulti.push(newHostname);
              changedHostnames = true;
            }
          });
          if (changedHostnames) {
            const updatedHostnames = hostnameArrayMulti.join("\n");
            await chrome.storage.sync.set({ hostnames: updatedHostnames });
            await applyRulesFromStorage();
            success = true;
          } else {
            console.log("No new hostnames to add.");
            success = false;
          }
          break;

        case "removeHostname":
          const currentHostnamesRemove =
            (await chrome.storage.sync.get("hostnames")).hostnames || "";
          let hostnameArrayRemove = currentHostnamesRemove
            .split("\n")
            .map((h) => h.trim())
            .filter(Boolean);
          const hostnameToRemove = payload.hostname;
          const initialLength = hostnameArrayRemove.length;
          hostnameArrayRemove = hostnameArrayRemove.filter(
            (h) => h !== hostnameToRemove
          );
          if (hostnameArrayRemove.length < initialLength) {
            const updatedHostnames = hostnameArrayRemove.join("\n");
            await chrome.storage.sync.set({ hostnames: updatedHostnames });
            await applyRulesFromStorage();
            success = true;
          } else {
            console.log(`Hostname '${hostnameToRemove}' not found.`);
            success = false; // Indicate no change if not found
          }
          break;

        case "removeMultipleHostnames":
          const currentHostnamesRemoveMulti =
            (await chrome.storage.sync.get("hostnames")).hostnames || "";
          let hostnameArrayRemoveMulti = currentHostnamesRemoveMulti
            .split("\n")
            .map((h) => h.trim())
            .filter(Boolean);
          let removedHostnames = false;
          payload.hostnames.forEach((hostnameToRemove) => {
            const initialLen = hostnameArrayRemoveMulti.length;
            hostnameArrayRemoveMulti = hostnameArrayRemoveMulti.filter(
              (h) => h !== hostnameToRemove
            );
            if (hostnameArrayRemoveMulti.length < initialLen) {
              removedHostnames = true;
            }
          });
          if (removedHostnames) {
            const updatedHostnames = hostnameArrayRemoveMulti.join("\n");
            await chrome.storage.sync.set({ hostnames: updatedHostnames });
            await applyRulesFromStorage();
            success = true;
          } else {
            console.log("No specified hostnames were found to remove.");
            success = false;
          }
          break;

        case "clearHostnames":
          await chrome.storage.sync.set({ hostnames: "" });
          await applyRulesFromStorage();
          success = true;
          break;

        case "addHeader":
          const currentHeaders =
            (await chrome.storage.sync.get("requestHeaders")).requestHeaders ||
            "";
          let headerLines = currentHeaders
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          const newHeaderName = payload.headerName;
          const newHeaderValue = payload.headerValue;

          let headerFound = false;
          // Update existing header if name matches
          headerLines = headerLines.map((line) => {
            const [name] = line.split(":");
            if (name.trim().toLowerCase() === newHeaderName.toLowerCase()) {
              headerFound = true;
              return `${newHeaderName}: ${newHeaderValue}`; // Update existing header line
            }
            return line;
          });

          // Add new header if not found
          if (!headerFound) {
            headerLines.push(`${newHeaderName}: ${newHeaderValue}`);
          }

          const updatedHeaders = headerLines.join("\n");
          await chrome.storage.sync.set({ requestHeaders: updatedHeaders });
          await applyRulesFromStorage();
          success = true;
          break;

        case "addMultipleHeaders":
          const currentHeadersMulti =
            (await chrome.storage.sync.get("requestHeaders")).requestHeaders ||
            "";
          let headerLinesMulti = currentHeadersMulti
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          let changedHeaders = false;

          payload.headers.forEach((newHeader) => {
            let headerName = newHeader.headerName;
            let headerValue = newHeader.headerValue;
            let found = false;

            // Check if header already exists by name and update
            headerLinesMulti = headerLinesMulti.map((line) => {
              const [existingName] = line.split(":");
              if (
                existingName.trim().toLowerCase() === headerName.toLowerCase()
              ) {
                found = true;
                changedHeaders = true;
                return `${headerName}: ${headerValue}`;
              }
              return line;
            });

            // If not found, add it as a new header
            if (!found) {
              headerLinesMulti.push(`${headerName}: ${headerValue}`);
              changedHeaders = true;
            }
          });

          if (changedHeaders) {
            const updatedHeaders = headerLinesMulti.join("\n");
            await chrome.storage.sync.set({ requestHeaders: updatedHeaders });
            await applyRulesFromStorage();
            success = true;
          } else {
            console.log("No new headers to add or update.");
            success = false;
          }
          break;

        case "removeHeader":
          const currentHeadersRemove =
            (await chrome.storage.sync.get("requestHeaders")).requestHeaders ||
            "";
          let headerLinesRemove = currentHeadersRemove
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          const headerNameToRemove = payload.headerName;

          const initialHeaderLength = headerLinesRemove.length;
          headerLinesRemove = headerLinesRemove.filter((line) => {
            const [name] = line.split(":");
            return (
              name.trim().toLowerCase() !== headerNameToRemove.toLowerCase()
            );
          });

          if (headerLinesRemove.length < initialHeaderLength) {
            const updatedHeaders = headerLinesRemove.join("\n");
            await chrome.storage.sync.set({ requestHeaders: updatedHeaders });
            await applyRulesFromStorage();
            success = true;
          } else {
            console.log(`Header '${headerNameToRemove}' not found.`);
            success = false; // Indicate no change if not found
          }
          break;

        case "removeMultipleHeaders":
          const currentHeadersRemoveMulti =
            (await chrome.storage.sync.get("requestHeaders")).requestHeaders ||
            "";
          let headerLinesRemoveMulti = currentHeadersRemoveMulti
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          let removedHeaders = false;

          payload.headerNames.forEach((headerNameToRemove) => {
            const initialLen = headerLinesRemoveMulti.length;
            headerLinesRemoveMulti = headerLinesRemoveMulti.filter((line) => {
              const [name] = line.split(":");
              return (
                name.trim().toLowerCase() !== headerNameToRemove.toLowerCase()
              );
            });
            if (headerLinesRemoveMulti.length < initialLen) {
              removedHeaders = true;
            }
          });

          if (removedHeaders) {
            const updatedHeaders = headerLinesRemoveMulti.join("\n");
            await chrome.storage.sync.set({ requestHeaders: updatedHeaders });
            await applyRulesFromStorage();
            success = true;
          } else {
            console.log("No specified headers were found to remove.");
            success = false;
          }
          break;

        case "clearHeaders":
          await chrome.storage.sync.set({ requestHeaders: "" });
          await applyRulesFromStorage();
          success = true;
          break;

        default:
          console.warn("Unknown API method:", method);
          success = false;
          break;
      }
    } else {
      console.warn("Unknown message type:", request.type);
      success = false;
    }

    sendResponse({ success: success, data: data });
  })();
  return true; // Indicates that the response will be sent asynchronously
});
