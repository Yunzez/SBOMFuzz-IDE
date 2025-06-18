const vscode = acquireVsCodeApi();
function logToExtension(message) {
  vscode.postMessage({ command: "log", message });
}

function runTarget(name) {
  vscode.postMessage({ command: "runFuzz", target: name });
}

var pathSelected = null;

// Ask extension backend to find project root
vscode.postMessage({ command: "getCargoProjectRoot" });
// Listen for reply
window.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg.command === "cargoProjectRoot") {
    const pathDiv = document.getElementById("path-display-container");
    if (msg.path) {
      console.log("Got Cargo root:", msg.path);
      pathDiv.innerHTML = `Cargo Project Root: ${msg.path}`;
      pathSelected = msg.path;
    } else {
      pathDiv.innerHTML = "No Cargo project found.";
    }
  }
});

// Example entry list injection
const entries = ["mod::func1", "mod::func2"];
const targetContainer = document.getElementById("entry-list");
const entryButton = document.getElementById("entry-button");
entryButton.addEventListener("click", () => {
  vscode.postMessage({ command: "requestEntries", target: "none" });
});

const startButton = document.getElementById("start-analyzer");
startButton.addEventListener("click", () => {
  vscode.postMessage({
    command: "runAnalyzer",
    target: "none",
    projectPath: pathSelected,
  });
});
entries.forEach((name) => {
  const targetDiv = document.createElement("div");
  targetDiv.className = "item";
  targetDiv.innerHTML = `${name} <button onclick="runTarget('${name}')">Run</button>`;
  targetContainer.appendChild(targetDiv);
});

window.addEventListener("message", (event) => {
  const message = event.data;

  if (message.command === "rustAnalysisDone") {
    logToExtension("Rust analysis completed successfully, results available.");
    
    let results = message.results || [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const resultDiv = document.createElement("div");
      resultDiv.className = "result-item";
      resultDiv.style.cursor = "pointer";
      resultDiv.style.border = "1px solid #ccc";
      resultDiv.style.borderRadius = "6px";
      resultDiv.style.margin = "6px 0";
      resultDiv.style.padding = "8px";
      resultDiv.innerHTML = `
      <div style="font-weight:bold; margin-bottom:4px;">${result.functionName}</div>
      <div style="color:#555;">${result.functionLocation.filePath}</div>
    `;

      resultDiv.onclick = () => {
        vscode.postMessage({
          command: "openLocation",
          filePath: result.functionLocation.filePath,
          offset: result.functionLocation.offset,
        });
      };
      targetContainer.appendChild(resultDiv);
    }
    // Display results in DOM, or call some render function
    //   displayResults(message.results);
  }
});
