// messaging.js

const vscode = acquireVsCodeApi();

let onRustAnalysisDone = null;
let onGlobalContext = null;
let onFuzzTargetsListed = null;
let onUpdateFunctionStatus = null;

export function setupMessaging(handlers = {}) {
  // Assign callback functions
  onRustAnalysisDone = handlers.onRustAnalysisDone || (() => {});
  onGlobalContext = handlers.onGlobalContext || (() => {});
  onFuzzTargetsListed = handlers.onFuzzTargetsListed || (() => {});
  onUpdateFunctionStatus = handlers.onUpdateFunctionStatus || (() => {});
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

      case "globalBroadcast":
        switch (msg.eventType) {
          case "HarnessStarted":
            // handlers.onHarnessStarted(msg.data);
            break;
          case "HarnessStopped":
            // handlers.onHarnessStopped(msg.data);
            break;
          case "HarnessFailed":
            console.log("HarnessFailed event received:", msg);
            document
              .querySelector(`.${msg.name}-stop-btn`)
              ?.style.setProperty("display", "none");
            document
              .querySelector(`.${msg.name}-run-btn`)
              ?.style.setProperty("display", "inline-block");
            break;
          case "HarnessOptimized":
            // handlers.onHarnessOptimized(msg.data);
            break;
          case "UpdateFunctionStatus":
            onUpdateFunctionStatus?.(msg);
            break;
          default:
            console.warn("Unhandled globalBroadcast type:", msg.type);
            break;
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

      case "refreshHarnessList":
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
