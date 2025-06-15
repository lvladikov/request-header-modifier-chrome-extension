document.addEventListener("DOMContentLoaded", () => {
  const hostnamesInput = document.getElementById("hostnames");
  const requestHeadersInput = document.getElementById("request-headers");
  const saveButton = document.getElementById("save-button");
  const clearButton = document.getElementById("clear-button");
  const corsButton = document.getElementById("cors-button");
  const statusMessage = document.getElementById("status-message");
  const enableToggle = document.getElementById("enable-toggle");
  const statusText = document.getElementById("status-text");

  // Helper Functions
  const showStatus = (message, isError = false) => {
    statusMessage.textContent = message;
    statusMessage.className = `tc mt10 ${isError ? "red" : "green"}`;
    setTimeout(() => {
      statusMessage.textContent = "";
    }, 3000);
  };

  const updateToggleUI = (isEnabled) => {
    enableToggle.checked = isEnabled;
    statusText.textContent = isEnabled ? "Enabled" : "Disabled";
    statusText.className = `${isEnabled ? "green" : "red"}`;
  };

  // Event Listeners
  enableToggle.addEventListener("change", () => {
    chrome.storage.local.set({ isEnabled: enableToggle.checked });
  });

  // Save the rule settings to sync storage.
  saveButton.addEventListener("click", () => {
    const hostnames = hostnamesInput.value.trim();
    const requestHeaders = requestHeadersInput.value.trim();

    if (!hostnames && !requestHeaders) {
      showStatus("Please enter hostnames or headers to apply rules.", true);
      return;
    }

    chrome.storage.sync.set({ hostnames, requestHeaders }, () => {
      // Tell the service worker to apply the newly saved rules.
      chrome.runtime.sendMessage({ type: "updateRules" }, (response) => {
        if (response?.success) {
          showStatus("Rules applied successfully!", false);
        } else {
          showStatus("Failed to apply rules.", true);
        }
      });
    });
  });

  // Clear settings and disable the extension.
  clearButton.addEventListener("click", () => {
    hostnamesInput.value = "";
    requestHeadersInput.value = "";

    // Clear the rule configuration.
    chrome.storage.sync.clear(() => {
      // Set the extension state to disabled. The service worker will handle clearing rules and updating the badge.
      chrome.storage.local.set({ isEnabled: false }, () => {
        showStatus("All settings cleared and extension disabled.", false);
      });
    });
  });

  // CORS button event listener
  corsButton.addEventListener("click", () => {
    requestHeadersInput.value = `Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: *`;
    showStatus("CORS headers pre-filled!", false);
  });

  // Loads the current state and settings when the popup is opened.
  const loadState = async () => {
    // Load enabled state and update the toggle switch.
    const { isEnabled } = await chrome.storage.local.get({ isEnabled: true });
    updateToggleUI(isEnabled);

    // Load hostnames and headers and populate the textareas.
    const { hostnames, requestHeaders } = await chrome.storage.sync.get([
      "hostnames",
      "requestHeaders",
    ]);
    if (hostnames) hostnamesInput.value = hostnames;
    if (requestHeaders) requestHeadersInput.value = requestHeaders;
  };

  // Add this listener to update the UI when storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.isEnabled) {
      updateToggleUI(changes.isEnabled.newValue);
    }
    // Listen for changes in sync storage (where hostnames and headers are stored)
    if (namespace === "sync") {
      if (changes.hostnames) {
        hostnamesInput.value = changes.hostnames.newValue || "";
      }
      if (changes.requestHeaders) {
        requestHeadersInput.value = changes.requestHeaders.newValue || "";
      }
    }
  });

  loadState();
});
