// This script runs in the same JavaScript context as the web page.
// It can access window and other global variables.

// Exposing the API to the global window object
window.corsHeaderModifier = {
  // Enables the CORS header modification.
  // returns a boolean promise that resolves to true if enabled successfully, false otherwise.
  enable: async () => {
    return new Promise((resolve) => {
      // Send message to the content script (which will then relay to service worker)
      window.postMessage(
        {
          type: "CORS_MODIFIER_API_CALL",
          method: "enable",
        },
        "*"
      );

      console.log("CORS Header Modifier: Enabling...");
      resolve(true);
    });
  },

  // Disables the CORS header modification.
  // returns a boolean promise that resolves to true if disabled successfully, false otherwise.
  disable: async () => {
    return new Promise((resolve) => {
      // Send message to the content script (which will then relay to service worker)
      window.postMessage(
        {
          type: "CORS_MODIFIER_API_CALL",
          method: "disable",
        },
        "*"
      );

      console.log("CORS Header Modifier: Disabling...");
      resolve(true);
    });
  },
};
