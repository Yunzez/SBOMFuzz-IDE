// messaging.js

const vscode = acquireVsCodeApi();

let onRustAnalysisDone = null;
let onCargoProjectRoot = null;

export function setupMessaging(handlers = {}) {
  // Assign callback functions
  onRustAnalysisDone = handlers.onRustAnalysisDone || (() => {});
  onCargoProjectRoot = handlers.onCargoProjectRoot || (() => {});

  // Listen for messages from the extension
  window.addEventListener("message", (event) => {
    const msg = event.data;

    switch (msg.command) {
      case "cargoProjectRoot":
        if (onCargoProjectRoot) {
          onCargoProjectRoot(msg.path);
        }
        break;

      case "rustAnalysisDone":
        log("Rust analysis completed successfully");
        if (onRustAnalysisDone) {
          onRustAnalysisDone(msg.results || []);
        }
        break;

      default:
        console.warn("Unhandled message from extension:", msg);
        break;
    }
  });

  // Request project root immediately
  sendMessage({ command: "getCargoProjectRoot" });
}

// 🔼 Used to send messages to the extension
export function sendMessage(msg) {
  vscode.postMessage(msg);
}

export function log(message) {
  sendMessage({ command: "log", message });
}
