const vscode = acquireVsCodeApi();

function runTarget(name) {
  vscode.postMessage({ command: 'runFuzz', target: name });
}

// Example entry list injection
const entries = ["mod::func1", "mod::func2"];
const targetContainer = document.getElementById("entry-list");
const entryButton = document.getElementById("entry-button");
entryButton.addEventListener("click", () => {
  vscode.postMessage({ command: 'requestEntries', target: 'none' });
});
entries.forEach(name => {
  const targetDiv = document.createElement("div");
    targetDiv.className = "item";
  targetDiv.innerHTML = `${name} <button onclick="runTarget('${name}')">Run</button>`;
  targetContainer.appendChild(targetDiv);
});
