// messaging.js

const vscode = acquireVsCodeApi();

let onRustAnalysisDone = null;

export function setupMessaging(handlers = {}) {
  // Assign callback functions
  onRustAnalysisDone = handlers.onRustAnalysisDone || (() => {});
  onGlobalContext = handlers.onGlobalContext || (() => {});
  onFuzzTargetsListed = handlers.onFuzzTargetsListed || (() => {});
  // Listen for messages from the extension
  window.addEventListener("message", (event) => {
    // ! this handles messages sent from the extension
    const msg = event.data;

    switch (msg.command) {
     
      case "globalContext":
        if (onGlobalContext) {
          onGlobalContext(msg.context || {});
        }
        break;

      case "rustAnalysisDone":
        log("Rust analysis completed successfully");
        if (onRustAnalysisDone) {
          onRustAnalysisDone(msg.results || []);
        }
        break;

      case "fuzzTargetsListed":
        if (onFuzzTargetsListed) {
          onFuzzTargetsListed(msg.targets || []);
        }
        break;

      default:
        console.warn("Unhandled message from extension:", msg);
        break;
    }
  });

  sendMessage({ command: "getGlobaclContext" });
}

// 🔼 Used to send messages to the extension
export function sendMessage(msg) {
  vscode.postMessage(msg);
}

export function log(message) {
  sendMessage({ command: "log", message });
}
