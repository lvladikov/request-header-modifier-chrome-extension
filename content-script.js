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
  // We only accept messages from ourselves and ensure it's a REQUEST_HEADER_MODIFIER_API_CALL
  if (
    event.source !== window ||
    !event.data ||
    event.data.type !== "REQUEST_HEADER_MODIFIER_API_CALL"
  ) {
    return;
  }

  const { method, payload, messageId } = event.data; // Extract method, payload, and messageId

  console.log(
    `content-script.js: Relaying message to service worker. Type: 'apiCall', Method: '${method}', Payload:`,
    payload
  );
  // Send the message to the service worker
  // The service worker's listener expects type "apiCall" for these specific method calls
  chrome.runtime.sendMessage(
    { type: "apiCall", method: method, payload: payload },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error relaying message to service worker:",
          chrome.runtime.lastError.message
        );
        // Send back an error response to the main world
        event.source.postMessage(
          {
            type: "REQUEST_HEADER_MODIFIER_API_RESPONSE",
            messageId: messageId, // Include messageId in response
            success: false,
            error: chrome.runtime.lastError.message,
          },
          event.origin
        );
      } else {
        console.log(
          `Relayed '${method}' request to service worker. Success: ${response.success}`
        );
        // Send a response back to the main world
        event.source.postMessage(
          {
            type: "REQUEST_HEADER_MODIFIER_API_RESPONSE",
            messageId: messageId, // Include messageId in response
            success: response.success,
            data: response.data, // Pass any data from service worker back
          },
          event.origin
        );
      }
    }
  );
});
