import { setupMessaging, sendMessage, log } from "./messaging.js";

let pathSelected = null;
let fuzzRootSelected = null;
let functionTargets = null;
let selectedFilter = null;
const targetContainer = document.getElementById("entry-list");
const pathDiv = document.getElementById("path-display-container");

function renderFunctionResults(results, targetContainer, priority) {
  targetContainer.innerHTML = ""; // Clear previous results
  // Separate ignored and non-ignored results
  const nonIgnored = results.filter((r) => r.status !== "Ignore");
  const ignored = results.filter((r) => r.status === "Ignore");

  // Sort non-ignored by priorityScore descending
  nonIgnored.sort((a, b) => b.priorityScore - a.priorityScore);

  // Concatenate non-ignored and ignored (ignored at the bottom)
  // results = [...nonIgnored, ...ignored];

  // Apply additional sorting based on the selected filter
  switch (priority) {
    case "unsafe-block-filter":
      nonIgnored.sort((a, b) => b.unsafeScore - a.unsafeScore);
      break;
    case "parameters-filter":
      nonIgnored.sort((a, b) => b.paramCount - a.paramCount);
      break;
    case "centrality-filter":
      nonIgnored.sort((a, b) => b.centralityScore - a.centralityScore);
      break;
    case "usage-filter":
      nonIgnored.sort((a, b) => b.usageCount - a.usageCount);
      break;
    default:
      // Default to priorityScore sorting
      nonIgnored.sort((a, b) => b.priorityScore - a.priorityScore);
      break;
  }

  console.log("Sorted non-ignored results:", nonIgnored);

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
    const filtersDiv = document.createElement("div");
    filtersDiv.id = "filters-container";
    const functionListDiv = document.createElement("div");
    targetContainer.appendChild(filtersDiv);
    targetContainer.appendChild(functionListDiv);
    if (context.results && context.results.length > 0) {
      functionTargets = context.results;

      loadFilters(functionTargets, filtersDiv, functionListDiv);
      renderFunctionResults(functionTargets, functionListDiv, "priority-filter");
    }
  },
});

const loadFilters = (functionTargets, targetContainer, functionListDiv) => {
  console.log("Loading filters");

  const filters = [
    { id: "priority-filter", label: "Priority Score", default: true },
    { id: "unsafe-block-filter", label: "Unsafe Block", default: false },
    {
      id: "parameters-filter",
      label: "Parameters Count",
      default: false,
    },
    {
      id: "centrality-filter",
      label: "Centrality Score",
      default: false,
    },
    { id: "usage-filter", label: "Usage Weights", default: false },
  ];

  filters.forEach((filter) => {
    const button = document.createElement("button");
    button.id = filter.id;
    button.textContent = filter.label;
    button.className = "filter-button";
    button.style.marginRight = "8px";
    if (filter.default) {
      button.classList.add("selected");
      selectedFilter = filter; // Set the default filter
    }

    button.addEventListener("click", () => {
      console.log(`Filter applied: ${filter.label}`);
      selectedFilter = filter; // Update the selected filter
      // Remove 'selected' class from all filter buttons
      const allButtons = targetContainer.querySelectorAll(".filter-button");
      allButtons.forEach((btn) => btn.classList.remove("selected"));

      // Add 'selected' class to the clicked button
      button.classList.add("selected");
      renderFunctionResults(functionTargets, functionListDiv, filter.id); // Pass the button as the priority filter
      // Add filter logic here
    });

    targetContainer.appendChild(button);
  });
};

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
