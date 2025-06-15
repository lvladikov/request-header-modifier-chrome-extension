// This script runs in the same JavaScript context as the web page.
// It can access window and other global variables.

// Helper to send messages to the content script and get a response
const sendMessageToExtension = (method, payload = {}) => {
  return new Promise((resolve) => {
    const messageId = crypto.randomUUID(); // Unique ID for this message
    const handler = (event) => {
      if (
        event.source !== window ||
        !event.data ||
        event.data.type !== "REQUEST_HEADER_MODIFIER_API_RESPONSE" ||
        event.data.messageId !== messageId
      ) {
        return;
      }
      window.removeEventListener("message", handler);
      resolve(event.data);
    };
    window.addEventListener("message", handler);

    console.log(
      `main.js: Sending message type 'REQUEST_HEADER_MODIFIER_API_CALL', method: '${method}', payload:`,
      payload
    );
    window.postMessage(
      {
        type: "REQUEST_HEADER_MODIFIER_API_CALL", // This type is used for cross-world communication
        method: method, // This method is interpreted by content-script.js and then service-worker.js
        payload: payload,
        messageId: messageId, // Include messageId for response matching
      },
      "*"
    );
  });
};

// Exposing the API to the global window object
window.requestHeaderModifier = {
  /**
   * Enables the request header modification.
   * @returns {Promise<boolean>} A promise that resolves to true if enabled successfully, false otherwise.
   */
  enable: async () => {
    console.log("Request Header Modifier: Enabling...");
    const response = await sendMessageToExtension("toggleExtension", {
      isEnabled: true,
    });
    return response.success;
  },

  /**
   * Disables the request header modification.
   * @returns {Promise<boolean>} A promise that resolves to true if disabled successfully, false otherwise.
   */
  disable: async () => {
    console.log("Request Header Modifier: Disabling...");
    const response = await sendMessageToExtension("toggleExtension", {
      isEnabled: false,
    });
    return response.success;
  },

  /**
   * Adds a hostname to the list of target hostnames.
   * @param {string} hostname - The hostname to add (e.g., "api.example.com").
   * @returns {Promise<boolean>} A promise that resolves to true if added successfully, false otherwise.
   */
  addHostname: async (hostname) => {
    if (typeof hostname !== "string" || !hostname.trim()) {
      console.error("addHostname: Hostname must be a non-empty string.");
      return false;
    }
    console.log(`Request Header Modifier: Adding hostname '${hostname}'...`);
    const response = await sendMessageToExtension("addHostname", {
      hostname: hostname.trim(),
    });
    return response.success;
  },

  /**
   * Adds multiple hostnames to the list of target hostnames.
   * @param {string[]} hostnames - An array of hostnames to add (e.g., ["api.example.com", "api.test.com"]).
   * @returns {Promise<boolean>} A promise that resolves to true if all added successfully, false otherwise.
   */
  addHostnames: async (hostnames) => {
    if (
      !Array.isArray(hostnames) ||
      hostnames.some((h) => typeof h !== "string" || !h.trim())
    ) {
      console.error(
        "addHostnames: Input must be an array of non-empty strings."
      );
      return false;
    }
    console.log(
      `Request Header Modifier: Adding hostnames ${hostnames.join(", ")}...`
    );
    const response = await sendMessageToExtension("addMultipleHostnames", {
      hostnames: hostnames.map((h) => h.trim()).filter(Boolean),
    });
    return response.success;
  },

  /**
   * Removes a hostname from the list of target hostnames.
   * @param {string} hostname - The hostname to remove.
   * @returns {Promise<boolean>} A promise that resolves to true if removed successfully, false otherwise.
   */
  removeHostname: async (hostname) => {
    if (typeof hostname !== "string" || !hostname.trim()) {
      console.error("removeHostname: Hostname must be a non-empty string.");
      return false;
    }
    console.log(`Request Header Modifier: Removing hostname '${hostname}'...`);
    const response = await sendMessageToExtension("removeHostname", {
      hostname: hostname.trim(),
    });
    return response.success;
  },

  /**
   * Removes multiple hostnames from the list of target hostnames.
   * @param {string[]} hostnames - An array of hostnames to remove.
   * @returns {Promise<boolean>} A promise that resolves to true if any hostnames were removed successfully, false otherwise.
   */
  removeHostnames: async (hostnames) => {
    if (
      !Array.isArray(hostnames) ||
      hostnames.some((h) => typeof h !== "string" || !h.trim())
    ) {
      console.error(
        "removeHostnames: Input must be an array of non-empty strings."
      );
      return false;
    }
    console.log(
      `Request Header Modifier: Removing hostnames ${hostnames.join(", ")}...`
    );
    const response = await sendMessageToExtension("removeMultipleHostnames", {
      hostnames: hostnames.map((h) => h.trim()).filter(Boolean),
    });
    return response.success;
  },

  /**
   * Clears all hostnames from the list.
   * @returns {Promise<boolean>} A promise that resolves to true if cleared successfully, false otherwise.
   */
  clearHostnames: async () => {
    console.log("Request Header Modifier: Clearing all hostnames...");
    const response = await sendMessageToExtension("clearHostnames");
    return response.success;
  },

  /**
   * Adds a request header to the list. If a header with the same name exists, its value will be updated.
   * @param {string | object} header - The header to add. Can be a string like "Header-Name: Header-Value" or an object like {headerName: "Header-Value"}.
   * @returns {Promise<boolean>} A promise that resolves to true if added/updated successfully, false otherwise.
   */
  addHeader: async (header) => {
    let headerName, headerValue;

    if (typeof header === "string") {
      const parts = header.split(":");
      if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) {
        console.error(
          "addHeader: String format must be 'Header-Name: Header-Value'."
        );
        return false;
      }
      headerName = parts[0].trim();
      headerValue = parts.slice(1).join(":").trim(); // Handle values with colons
    } else if (typeof header === "object" && header !== null) {
      const keys = Object.keys(header);
      if (keys.length !== 1 || !keys[0].trim()) {
        console.error(
          "addHeader: Object format must be {headerName: 'headerValue'} with a single key."
        );
        return false;
      }
      headerName = keys[0].trim();
      headerValue = String(header[headerName]).trim();
    } else {
      console.error(
        "addHeader: Header must be a non-empty string or an object {headerName: headerValue}."
      );
      return false;
    }

    if (!headerName || !headerValue) {
      console.error("addHeader: Header name and value cannot be empty.");
      return false;
    }

    console.log(
      `Request Header Modifier: Adding/Updating header '${headerName}: ${headerValue}'...`
    );
    const response = await sendMessageToExtension("addHeader", {
      headerName,
      headerValue,
    });
    return response.success;
  },

  /**
   * Adds multiple request headers to the list. If headers with the same names exist, their values will be updated.
   * @param {(string | object)[]} headers - An array of headers to add. Each element can be a string like "Header-Name: Header-Value" or an object like {headerName: "Header-Value"}.
   * @returns {Promise<boolean>} A promise that resolves to true if all added/updated successfully, false otherwise.
   */
  addHeaders: async (headers) => {
    if (
      !Array.isArray(headers) ||
      headers.some(
        (h) =>
          (typeof h !== "string" || !h.trim()) &&
          (typeof h !== "object" ||
            h === null ||
            Object.keys(h).length !== 1 ||
            !Object.keys(h)[0].trim())
      )
    ) {
      console.error(
        "addHeaders: Input must be an array of non-empty strings ('Name: Value') or objects ({name: 'Value'})."
      );
      return false;
    }
    console.log(`Request Header Modifier: Adding multiple headers...`);
    const processedHeaders = headers
      .map((header) => {
        if (typeof header === "string") {
          const parts = header.split(":");
          if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) {
            console.warn(
              `addHeaders: Invalid header string format: '${header}'. Skipping.`
            );
            return null;
          }
          return {
            headerName: parts[0].trim(),
            headerValue: parts.slice(1).join(":").trim(),
          };
        } else if (typeof header === "object" && header !== null) {
          const keys = Object.keys(header);
          if (keys.length !== 1 || !keys[0].trim()) {
            console.warn(
              `addHeaders: Invalid header object format: ${JSON.stringify(
                header
              )}. Skipping.`
            );
            return null;
          }
          return {
            headerName: keys[0].trim(),
            headerValue: String(header[keys[0]]).trim(),
          };
        }
        return null;
      })
      .filter(Boolean); // Filter out any nulls from invalid formats

    if (processedHeaders.length === 0) {
      console.warn(
        "addHeaders: No valid headers to add after processing input array."
      );
      return false;
    }

    const response = await sendMessageToExtension("addMultipleHeaders", {
      headers: processedHeaders,
    });
    return response.success;
  },

  /**
   * Removes a request header from the list.
   * @param {string | object} header - The header to remove. Can be a string like "Header-Name: Header-Value" (only Header-Name is used for removal)
   * or an object like {headerName: "Header-Value"} (only headerName is used for removal).
   * @returns {Promise<boolean>} A promise that resolves to true if removed successfully, false if not found.
   */
  removeHeader: async (header) => {
    let headerName;

    if (typeof header === "string") {
      const parts = header.split(":");
      headerName = parts[0].trim();
    } else if (typeof header === "object" && header !== null) {
      const keys = Object.keys(header);
      if (keys.length !== 1 || !keys[0].trim()) {
        console.error(
          "removeHeader: Object format must be {headerName: 'headerValue'} with a single key."
        );
        return false;
      }
      headerName = keys[0].trim();
    } else {
      console.error(
        "removeHeader: Header must be a non-empty string or an object {headerName: headerValue}."
      );
      return false;
    }

    if (!headerName) {
      console.error("removeHeader: Header name cannot be empty for removal.");
      return false;
    }

    console.log(
      `Request Header Modifier: Removing header with name '${headerName}'...`
    );
    const response = await sendMessageToExtension("removeHeader", {
      headerName,
    });
    return response.success;
  },

  /**
   * Removes multiple request headers from the list.
   * @param {(string | object)[]} headers - An array of headers to remove. Only the header name is considered for removal.
   * @returns {Promise<boolean>} A promise that resolves to true if any headers were removed successfully, false otherwise.
   */
  removeHeaders: async (headers) => {
    if (
      !Array.isArray(headers) ||
      headers.some(
        (h) =>
          (typeof h !== "string" || !h.trim()) &&
          (typeof h !== "object" ||
            h === null ||
            Object.keys(h).length !== 1 ||
            !Object.keys(h)[0].trim())
      )
    ) {
      console.error(
        "removeHeaders: Input must be an array of non-empty strings ('Name: Value') or objects ({name: 'Value'})."
      );
      return false;
    }
    console.log(`Request Header Modifier: Removing multiple headers...`);
    const headerNamesToRemove = headers
      .map((header) => {
        if (typeof header === "string") {
          const parts = header.split(":");
          return parts[0].trim();
        } else if (typeof header === "object" && header !== null) {
          const keys = Object.keys(header);
          return keys[0].trim();
        }
        return null;
      })
      .filter(Boolean); // Filter out any nulls from invalid formats

    if (headerNamesToRemove.length === 0) {
      console.warn(
        "removeHeaders: No valid header names to remove after processing input array."
      );
      return false;
    }

    const response = await sendMessageToExtension("removeMultipleHeaders", {
      headerNames: headerNamesToRemove,
    });
    return response.success;
  },

  /**
   * Clears all request headers from the list.
   * @returns {Promise<boolean>} A promise that resolves to true if cleared successfully, false otherwise.
   */
  clearHeaders: async () => {
    console.log("Request Header Modifier: Clearing all headers...");
    const response = await sendMessageToExtension("clearHeaders");
    return response.success;
  },
};
