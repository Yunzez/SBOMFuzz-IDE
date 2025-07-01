import { setupMessaging, sendMessage, log } from "./messaging.js";

let pathSelected = null;
let fuzzRootSelected = null;
let functionTargets = null;
const targetContainer = document.getElementById("entry-list");
const pathDiv = document.getElementById("path-display-container");

function renderFunctionResults(results, targetContainer) {
  targetContainer.innerHTML = ""; // Clear previous results
  // Separate ignored and non-ignored results
  const nonIgnored = results.filter(r => r.status !== "Ignore");
  const ignored = results.filter(r => r.status === "Ignore");

  // Sort non-ignored by priorityScore descending
  nonIgnored.sort((a, b) => b.priorityScore - a.priorityScore);

  // Concatenate non-ignored and ignored (ignored at the bottom)
  results = [...nonIgnored, ...ignored];
  for (const result of results) {
    log(`status: ${result.status}`);
    // Create colored status tag
    const statusColor =
      {
        New: "gray",
        Ignore: "darkred",
        HarnessGenerated: "green",
      }[result.status] || "black";

    const statusBadge = `<span class="status-badge" style="background:${statusColor};">${result.status}</span>`;

    const ignoreBtn = document.createElement("button");
    ignoreBtn.textContent = "Ignore";

    const generateBtn = document.createElement("button");
    generateBtn.textContent = "Generate Harness";

    const resultDiv = document.createElement("div");
    resultDiv.className = "function-button";
    resultDiv.innerHTML = `
        <div style="font-weight:bold; margin-bottom:4px;">
      ${result.functionModulePath}::${result.functionName} ${statusBadge}
        </div>
        <div>${result.functionLocation?.filePath.replace(
          pathSelected,
          ""
        )}</div>
        <div>Priority Score: ${result.priorityScore.toFixed(3)}</div>
        <div class="btns-div" style="margin-top:6px;"></div>
      `;

    // Add buttons to the last div (action area)
    const actionArea = resultDiv.getElementsByClassName("btns-div")[0];
    actionArea.appendChild(ignoreBtn);
    actionArea.appendChild(generateBtn);

    ignoreBtn.onclick = (event) => {
      event.stopPropagation(); // prevents triggering resultDiv.onclick
      result.status = "Ignore"; // Update status locally
      log(`ignore, ${result.status}`);
      renderFunctionResults(results, targetContainer); // Re-render to reflect changes
    };

    generateBtn.onclick = (event) => {
      event.stopPropagation();
      log("generate");
      result.status = "HarnessGenerated";
    };

    resultDiv.onclick = () => {
      sendMessage({
        command: "openLocation",
        filePath: result.functionLocation.filePath,
        offset: result.functionLocation.offset,
      });
    };

    targetContainer.appendChild(resultDiv);
  }
}

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
          command: "openLocation",
          filePath: target.path,
          offset: 0,
        });
      };

      targetList.appendChild(targetDiv);
    }
  },

  onRustAnalysisDone: (results) => {
    log("Rendering function results");
    targetContainer.innerHTML = ""; // Clear previous results
    renderFunctionResults(results, targetContainer);
  },

  onGlobalContext: (context) => {
    log("Global context received:", context.projectRoot);
    const projectRootPath = context.projectRoot;
    if (projectRootPath) {
      log("📦 Got Cargo project root: " + projectRootPath);
      pathSelected = projectRootPath;
      pathDiv.innerHTML = `Cargo Project Root: ${projectRootPath}`;
    } else {
      pathDiv.innerHTML = "No Cargo project found.";
    }

    const fuzzPathDiv = document.getElementById("fuzz-path-display");
    const fuzzRootPath = context.fuzzRoot;
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
    if (context.results && context.results.length > 0) {
      functionTargets = context.results;
      renderFunctionResults(functionTargets, targetContainer);
    }
  },
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
