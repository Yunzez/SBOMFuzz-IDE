import { setupMessaging, sendMessage, log } from "./messaging.js";

let pathSelected = null;
const targetContainer = document.getElementById("entry-list");
const pathDiv = document.getElementById("path-display-container");

export function toggleCollapse(headerEl) {
  const contentEl = headerEl.nextElementSibling;
  const isOpen = headerEl.classList.toggle("expanded");

  if (isOpen) {
    contentEl.style.display = "block";
  } else {
    contentEl.style.display = "none";
  }
}

const collapsibleHeaders = document.querySelectorAll(".collapsible-header");

collapsibleHeaders.forEach((header) => {
  log("Setting up collapsible header:", header.textContent);
  header.addEventListener("click", () => {
    log("Collapsible header clicked:", header.textContent);
    toggleCollapse(header);
  });
});

setupMessaging({
  onCargoProjectRoot: (projectRootPath) => {
    if (projectRootPath) {
      log("📦 Got Cargo project root: " + projectRootPath);
      pathSelected = projectRootPath;
      pathDiv.innerHTML = `Cargo Project Root: ${projectRootPath}`;
    } else {
      pathDiv.innerHTML = "No Cargo project found.";
    }
  },

  onRustAnalysisDone: (results) => {
    log("Rendering function results");
    targetContainer.innerHTML = ""; // Clear previous results
    for (const result of results) {
      const resultDiv = document.createElement("div");
      resultDiv.className = "function-button";
      resultDiv.innerHTML = `
        <div style="font-weight:bold; margin-bottom:4px;">
          ${result.functionModulePath}::${result.functionName}
        </div>
        <div>
          ${result.functionLocation.filePath.replace(pathSelected, "")}
        </div>
      `;

      resultDiv.onclick = () => {
        sendMessage({
          command: "openLocation",
          filePath: result.functionLocation.filePath,
          offset: result.functionLocation.offset,
        });
      };

      targetContainer.appendChild(resultDiv);
    }
  },
});

// 📤 Button actions
document.getElementById("entry-button").addEventListener("click", () => {
  sendMessage({ command: "requestEntries", target: "none" });
});

document.getElementById("start-analyzer").addEventListener("click", () => {
  sendMessage({
    command: "runAnalyzer",
    target: "none",
    projectPath: pathSelected,
  });
});

document.getElementById("test-vis").addEventListener("click", () => {
  sendMessage({ command: "testVisualization" });
});
