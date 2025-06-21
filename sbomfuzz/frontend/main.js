import { setupMessaging, sendMessage, log } from "./messaging.js";
import { getFuzzTargets } from "./fuzzTarget.js";
let pathSelected = null;
let fuzzRootSelected = null;
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

  onFuzzRoot: (fuzzRootPath) => {
    const fuzzPathDiv = document.getElementById("fuzz-path-display");

    if (fuzzRootPath) {
      log("🧪 Got Fuzz root: " + fuzzRootPath);
      fuzzRootSelected = fuzzRootPath;
      fuzzPathDiv.innerHTML = `Fuzz Root: ${fuzzRootPath}`;
      log("Getting Fuzz targets: ");
      sendMessage({ command: "getFuzzTargets", fuzzRoot: fuzzRootPath });
    } else {
      fuzzPathDiv.innerText = "No Fuzz root found.";
      const createRootButton = document.createElement("button");
      createRootButton.textContent = "Create a Root";
      createRootButton.addEventListener("click", () => {
        sendMessage({ command: "createFuzzRoot", target: pathSelected });
      });
      fuzzPathDiv.appendChild(createRootButton);
    }
  },

  onFuzzTargetsListed: (targets) => {
    log("🧪 Fuzz targets listed:", targets);
    const targetList = document.getElementById("harness-list");
    targetList.innerHTML = ""; // Clear previous targets
    if (targets.length === 0) {
      targetList.innerHTML = "<div>No fuzz targets found.</div>";
      return;
    }
    for (const target of targets) {
      const targetDiv = document.createElement("div");
      targetDiv.className = "function-button";
      targetDiv.innerHTML = `
        <div style="font-weight:bold; margin-bottom:4px;">
          ${target.name}
        </div>
        <div>
          ${target.path.replace(fuzzRootSelected, "")}
        </div>
      `;

      targetDiv.onclick = () => {
        sendMessage({
          command: "openFuzzTarget",
          filePath: target.path,
        });
      };

      targetList.appendChild(targetDiv);
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
