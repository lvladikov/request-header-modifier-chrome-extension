// This content script will be injected into web pages in an isolated world.
// Its purpose is to inject a new script into the page's main world.
// and act as a bridge for communication.

// Function to inject the main script (main.js)
function injectScript(file_path, tag) {
  // Ensure the document is ready before trying to append to a tag
  document.addEventListener("DOMContentLoaded", () => {
    const node = document.getElementsByTagName(tag)[0];
    if (node) {
      // Check if the node exists
      const script = document.createElement("script");
      script.setAttribute("type", "text/javascript");
      script.setAttribute("src", file_path);
      node.appendChild(script);
      console.log(`Injected ${file_path} into the ${tag} element.`);
    } else {
      console.error(`Could not find a '${tag}' element to inject the script.`);
    }
  });
}

// Inject the main-world script.
injectScript(chrome.runtime.getURL("main.js"), "body");

// Listen for messages from the main script (main.js)
window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) {
    return;
  }

  // Check if the message is from our CORS Modifier API
  if (event.data && event.data.type === "CORS_MODIFIER_API_CALL") {
    const { method } = event.data;
    let isEnabled;

    if (method === "enable") {
      isEnabled = true;
    } else if (method === "disable") {
      isEnabled = false;
    } else {
      console.warn("Unknown CORS_MODIFIER_API_CALL method:", method);
      return;
    }

    // Now, send the message to the service worker
    chrome.runtime.sendMessage(
      { type: "toggleExtension", isEnabled: isEnabled },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error relaying message to service worker:",
            chrome.runtime.lastError
          );
        } else {
          console.log(
            `Relayed '${method}' request to service worker. Success: ${response.success}, Enabled: ${response.isEnabled}`
          );
          // Send a response back to the main world
          event.source.postMessage(
            {
              type: "CORS_MODIFIER_API_RESPONSE",
              success: response.success,
              isEnabled: response.isEnabled,
            },
            event.origin
          );
        }
      }
    );
  }
});
