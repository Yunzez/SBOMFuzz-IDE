import { setupMessaging, sendMessage, log } from "./messaging.js";

let pathSelected = null;
let fuzzRootSelected = null;
let functionTargets = null;
const targetContainer = document.getElementById("entry-list");
const pathDiv = document.getElementById("path-display-container");

function renderFunctionResults(results, targetContainer) {
  targetContainer.innerHTML = ""; // Clear previous results
  // Separate ignored and non-ignored results
  const nonIgnored = results.filter((r) => r.status !== "Ignore");
  const ignored = results.filter((r) => r.status === "Ignore");

  // Sort non-ignored by priorityScore descending
  nonIgnored.sort((a, b) => b.priorityScore - a.priorityScore);

  // Concatenate non-ignored and ignored (ignored at the bottom)
  // results = [...nonIgnored, ...ignored];
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
    ignoreBtn.className = "negative-button";

    const generateBtn = document.createElement("button");
    generateBtn.textContent = "Generate Harness";
    generateBtn.className = "affirmative-button";
    generateBtn.style.marginLeft = "4px";

    const resultDiv = document.createElement("div");
    resultDiv.className = "function-button";
    resultDiv.innerHTML = `
      <div style="font-weight:bold; margin-bottom:4px; display: flex; gap: 2px; flex-wrap: wrap; align-items: center;">
      <span>${result.functionModulePath}::${result.functionName}</span>
    ${statusBadge}
      </div>
      <div>${result.functionLocation?.filePath.replace(pathSelected, "")}</div>
      <div class="priority-score" style="margin-top: 4px;">
      Priority Score: ${result.priorityScore.toFixed(3)}
      <span 
      class="info-icon" 
      style="margin-left: 4px; cursor: pointer;" 
      title="Hover to see score breakdown">ℹ️</span>
      </div>
      <div class="btns-div" style="margin-top:6px;"></div>
      `;

    // Get the priority score div first
    const priorityScoreDiv =
      resultDiv.getElementsByClassName("priority-score")[0];
    priorityScoreDiv.style.position = "relative"; // now works correctly

    // Create the breakdown box
    const scoreBreakdown = document.createElement("div");
    scoreBreakdown.className = "score-breakdown";

    scoreBreakdown.innerHTML = `
    <strong>Score Breakdown:</strong>
    <div style="margin: 0; padding-left: 16px;">
    <div>Param Count: ${result.paramCount.toFixed(1)}</div>
    <div>Function Usage: ${result.usageCount.toFixed(1)}</div>
    <div>Centrality Score: ${result.centralityScore.toFixed(5)}</div>
    <div>Unsafe Score: ${result.unsafeScore.toFixed(1)}</div>
    </div>
  `;

    // Append to container
    priorityScoreDiv.appendChild(scoreBreakdown);

    // Add hover functionality to show/hide the score breakdown
    const infoIcon = priorityScoreDiv.querySelector(".info-icon");
    infoIcon.addEventListener("mouseenter", () => {
      scoreBreakdown.style.display = "block";
    });
    infoIcon.addEventListener("mouseleave", () => {
      scoreBreakdown.style.display = "none";
    });

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
      log("generate");
      sendMessage({
        command: "generateHarness",
        fuzzRoot: fuzzRootSelected,
        target: result,
      });
      result.status = "HarnessGenerated";
      renderFunctionResults(results, targetContainer);
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

      const runBtn = document.createElement("button");
      runBtn.textContent = "Run";
      runBtn.className = "affirmative-button";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "negative-button";
      deleteBtn.style.marginLeft = "4px";

      targetDiv.className = "function-button";
      targetDiv.innerHTML = `
        <div style="font-weight:bold; margin-bottom:4px;">
          ${target.name}
        </div>
        <div>
          ${target.path.replace(fuzzRootSelected, "")}
        </div>
          <div class="btns-div" style="margin-top:6px;"></div>
      `;

      targetDiv.onclick = () => {
        sendMessage({
          command: "openLocation",
          filePath: target.path,
          offset: 0,
        });
      };

      const actionArea = targetDiv.getElementsByClassName("btns-div")[0];
      actionArea.appendChild(runBtn);
      actionArea.appendChild(deleteBtn);
      deleteBtn.onclick = (event) => {
        event.stopPropagation(); // prevents triggering targetDiv.onclick
        log(`Deleting fuzz target: ${target.name}`);
        sendMessage({ command: "deleteFuzzTarget", target: target.name });
      };
      runBtn.onclick = (event) => {
        event.stopPropagation(); // prevents triggering targetDiv.onclick
        log(`Running fuzz target: ${target.name}`);
        sendMessage({ command: "runFuzzTarget", target: target.name });
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
      fuzzPathDiv.innerHTML = `Fuzz Harness Root: ${fuzzRootPath}`;
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


document.getElementById("refresh-button").addEventListener("click", () => {
  sendMessage({ command: "showVisualization" });
});
