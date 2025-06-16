
const vscode = acquireVsCodeApi();

function runTarget(name) {
  vscode.postMessage({ command: 'runFuzz', target: name });
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
  vscode.postMessage({ command: 'requestEntries', target: 'none' });
});

const startButton = document.getElementById("start-analyzer");
startButton.addEventListener("click", () => {
  vscode.postMessage({ command: 'runAnalyzer', target: 'none', projectPath: pathSelected });
});
entries.forEach(name => {
  const targetDiv = document.createElement("div");
    targetDiv.className = "item";
  targetDiv.innerHTML = `${name} <button onclick="runTarget('${name}')">Run</button>`;
  targetContainer.appendChild(targetDiv);
});
