import { setupMessaging, sendMessage, log } from "./messaging.js";

let pathSelected = null;
let fuzzRootSelected = null;
let functionTargets = null;
let selectedFilter = null;
const targetContainer = document.getElementById("entry-list");
const pathDiv = document.getElementById("path-display-container");
function renderSearchBar(results, targetContainer, priority) {
  const searchContainer = document.createElement("div");
  searchContainer.style.marginBottom = "10px";
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search functions...";
  searchInput.classList.add("search-bar");
  const resultsDiv = document.createElement("div");
  searchInput.addEventListener("input", () => {
    resultsDiv.innerHTML = ""; // Clear previous results
    log(`Search input changed: ${searchInput.value}`);
    const query = searchInput.value.toLowerCase().trim();
    if (query === "") {
      // If the search query is empty, render all results
      renderFunctionResults(results, resultsDiv, priority);
    } else {
      const filteredResults = results.filter(
        (fn) =>
          fn.functionName.toLowerCase().includes(query) ||
          fn.functionModulePath.toLowerCase().includes(query)
      );
      log(`Filtered results: ${filteredResults.length}`);
      renderFunctionResults(filteredResults, resultsDiv, priority);
    }
  });
  searchContainer.appendChild(searchInput);
  targetContainer.appendChild(searchContainer);
  targetContainer.appendChild(resultsDiv);
  renderFunctionResults(results, resultsDiv, priority);
}

function startRendering(results, targetContainer, priority) {
  targetContainer.innerHTML = ""; // Clear previous results

  renderSearchBar(results, targetContainer, priority);
  // renderFunctionResults(results, targetContainer, priority);
}

function renderFunctionResults(results, targetContainer, priority) {
  targetContainer.innerHTML = ""; // Clear previous results
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
    // case "centrality-filter":
    //   nonIgnored.sort((a, b) => b.centralityScore - a.centralityScore);
    //   break;
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
    ignoreBtn.textContent = result.status !== "Ignore" ? "Ignore" : "Unignore";
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
    <strong>Function Details:</strong>
    <div style="margin: 0;">
    <div>Parameter Count: ${result.paramCount}</div>
    <div>Usage Count: ${result.usageCount}</div>
    <div>Unsafe: ${result.unsafeScore > 0 ? "Yes" : "No"}</div>
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
      result.status = result.status === "Ignore" ? "" : "Ignore";
      log(`ignore, ${result.status}`);
      renderFunctionResults(results, targetContainer, priority); // Re-render to reflect changes
    };

    generateBtn.onclick = (event) => {
      log("generate");
      sendMessage({
        command: "generateHarness",
        fuzzRoot: fuzzRootSelected,
        target: result,
      });
      result.status = "HarnessGenerated";
      renderFunctionResults(results, targetContainer, priority);
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
    startRendering(results, targetContainer);
  },

  onGlobalContext: (context) => {
    log("Global context received:", context.projectRoot);
    const projectRootPath = context.projectRoot;
    if (projectRootPath) {
      log("📦 Got Cargo project root: " + projectRootPath);
      pathSelected = projectRootPath;

      pathDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; padding: 6px; background: #f0f0f0; border-radius: 4px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <span style="font-weight: bold; color: #333;">Project Root:</span>
        <span style="color: #007acc;">${projectRootPath}</span>
      </div>
      `;
    } else {
      pathDiv.innerHTML = `
      <div style="padding: 8px; background: #ffe6e6; border-radius: 4px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <span style="font-weight: bold; color: #cc0000;">No Cargo project found.</span>
      </div>
      `;
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
      startRendering(functionTargets, functionListDiv, "priority-filter");
    }
  },
});

const loadFilters = (functionTargets, targetContainer, functionListDiv) => {
  console.log("Loading filters");
  const filterTitle = document.createElement("div");
  filterTitle.textContent = "Order By";
  filterTitle.style.fontWeight = "bold";
  filterTitle.style.marginBottom = "8px";
  targetContainer.appendChild(filterTitle);

  const filterButtonsContainer = document.createElement("div");
  const filters = [
    {
      id: "priority-filter",
      label: "Priority Score",
      default: true,
      filterDescription:
        "Priority Score is calculated comprehensively based on the 10 different metrics.",
    },
    {
      id: "unsafe-block-filter",
      label: "Unsafe Block",
      default: false,
      filterDescription:
        "Unsafe Block measures the presence of unsafe usage inside the function.",
    },
    {
      id: "parameters-filter",
      label: "Parameters Count",
      default: false,
      filterDescription:
        "Parameters Count represents the number of parameters a function takes.",
    },
    // {
    //   id: "centrality-filter",
    //   label: "Centrality Score",
    //   default: false,
    //   filterDescription:
    //     "Centrality Score measures how structurally embedded a function is in the crate's call/API graph. Functions with high centrality are called by many important functions, indicating their significance.",
    // },
    {
      id: "usage-filter",
      label: "Usage Counts",
      default: false,
      filterDescription:
        "Usage Counts measure how frequently a function is used directly.",
    },
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
      const currentFilterDescription = targetContainer.querySelector(
        ".filter-description"
      );
      if (currentFilterDescription) {
        currentFilterDescription.textContent = filter.filterDescription;
      }
      startRendering(functionTargets, functionListDiv, filter.id); // Pass the button as the priority filter
      // Add filter logic here
    });

    filterButtonsContainer.appendChild(button);
  });
  targetContainer.appendChild(filterButtonsContainer);
  const filterDescription = document.createElement("div");
  filterDescription.className = "filter-description";
  filterDescription.style.marginTop = "8px";
  filterDescription.textContent = filters[0].filterDescription; // Default description
  targetContainer.appendChild(filterDescription);
};

document.getElementById("start-analyzer").addEventListener("click", () => {
  vscode.postMessage({
    command: "executeCommand",
    commandId: "sbomfuzz.runAnalysisTool",
  });
});

document.getElementById("refresh-button").addEventListener("click", () => {
  vscode.postMessage({
    command: "executeCommand",
    commandId: "sbomfuzz.runAnalysisTool",
  });
});
