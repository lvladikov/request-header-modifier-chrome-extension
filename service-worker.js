// Constants
const RULE_ID_MODIFY_HEADERS = 1;
const BADGE_ON = { text: "ON", color: "#046604" }; // Green
const BADGE_OFF = { text: "OFF", color: "#a70606" }; // Red

// Initialization
chrome.runtime.onInstalled.addListener(() => {
  // On first install, set the state to enabled.
  chrome.storage.local.set({ isEnabled: true }, () => {
    // Explicitly update badge here after setting isEnabled
    chrome.action.setBadgeText({ text: BADGE_ON.text });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_ON.color });
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
    await updateRules(hostnames, requestHeaders || "");
  }
};

const updateRules = async (hostnamesStr, headersStr) => {
  const domains = hostnamesStr
    .split("\n")
    .map((h) => h.trim())
    .filter(Boolean);
  if (domains.length === 0) {
    await clearAllRules();
    return;
  }

  const requestHeadersToAdd = headersStr
    .split("\n")
    .map((line) => {
      const parts = line.split(":");
      return parts.length === 2
        ? { header: parts[0].trim(), operation: "set", value: parts[1].trim() }
        : null;
    })
    .filter(Boolean);

  const newRule = {
    id: RULE_ID_MODIFY_HEADERS,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: requestHeadersToAdd,
      responseHeaders: [
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
      ],
    },
    condition: {
      domains,
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
  if (request.type === "updateRules") {
    // When popup saves, just trigger the main apply function.
    applyRulesFromStorage().then(() => sendResponse({ success: true }));
    return true; // Async response.
  } else if (request.type === "toggleExtension") {
    chrome.storage.local.set({ isEnabled: request.isEnabled }, () => {
      sendResponse({ success: true, isEnabled: request.isEnabled });
    });
    return true; // Async response.
  }
});
