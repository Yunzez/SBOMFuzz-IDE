
function renderSearchBar(results, targetContainer, priority, options) {
  const { log } = options;
  const searchContainer = document.createElement("div");
  searchContainer.style.marginBottom = "10px";
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search functions...";
  searchInput.classList.add("search-bar");
  const resultsDiv = document.createElement("div");
  searchInput.addEventListener("input", () => {
    resultsDiv.innerHTML = "";
    log?.(`Search input changed: ${searchInput.value}`);
    const query = searchInput.value.toLowerCase().trim();
    if (query === "") {
      renderFunctionResults(results, resultsDiv, priority, options);
    } else {
      const filteredResults = results.filter(
        (fn) =>
          fn.functionName.toLowerCase().includes(query) ||
          fn.functionModulePath.toLowerCase().includes(query)
      );
      log?.(`Filtered results: ${filteredResults.length}`);
      renderFunctionResults(filteredResults, resultsDiv, priority, options);
    }
  });
  searchContainer.appendChild(searchInput);
  targetContainer.appendChild(searchContainer);
  targetContainer.appendChild(resultsDiv);
  renderFunctionResults(results, resultsDiv, priority, options);
}

export function startRendering(results, targetContainer, priority, options) {
  targetContainer.innerHTML = "";
  renderSearchBar(results, targetContainer, priority, options);
}

export function renderFunctionResults(
  results,
  targetContainer,
  priority,
  options
) {
  const {
    fuzzRootSelected,
    pathSelected,
    sendMessage,
    log,
    onStatusChange,
  } = options;

  targetContainer.innerHTML = "";
  const nonIgnored = results.filter((r) => r.status !== "Ignore");
  const ignored = results.filter((r) => r.status === "Ignore");
  nonIgnored.sort((a, b) => b.priorityScore - a.priorityScore);

  switch (priority) {
    case "unsafe-block-filter":
      nonIgnored.sort((a, b) => b.unsafeScore - a.unsafeScore);
      break;
    case "parameters-filter":
      nonIgnored.sort((a, b) => b.paramCount - a.paramCount);
      break;
    case "usage-filter":
      nonIgnored.sort((a, b) => b.usageCount - a.usageCount);
      break;
    default:
      nonIgnored.sort((a, b) => b.priorityScore - a.priorityScore);
      break;
  }

  const orderedResults = [...nonIgnored, ...ignored];

  for (const result of orderedResults) {

    const ignoreBtn = document.createElement("button");
    ignoreBtn.textContent = result.status !== "Ignore" ? "Ignore" : "Unignore";
    ignoreBtn.className = "negative-button";

    const generateBtn = document.createElement("button");
    generateBtn.textContent = "Generate Harness";
    generateBtn.className = "affirmative-button";
    generateBtn.style.marginLeft = "4px";

    const resultDiv = document.createElement("div");
    resultDiv.className = "function-button";
    const relativePath = pathSelected
      ? result.functionLocation?.filePath.replace(pathSelected, "")
      : result.functionLocation?.filePath || "";
    resultDiv.innerHTML = `
      <div style="font-weight:bold; margin-bottom:4px; display: flex; gap: 2px; flex-wrap: wrap; align-items: center;">
        <span>${result.functionModulePath}::${result.functionName}</span>
      </div>
      <div>${relativePath}</div>
      <div class="priority-score" style="margin-top: 4px;">
        Priority Score: ${result.priorityScore.toFixed(3)}
        <span
          class="info-icon"
          style="margin-left: 4px; cursor: pointer;"
          title="Hover to see score breakdown"
        >ℹ️</span>
      </div>
      <div class="btns-div" style="margin-top:6px;"></div>
    `;

    const priorityScoreDiv =
      resultDiv.getElementsByClassName("priority-score")[0];
    priorityScoreDiv.style.position = "relative";

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

    priorityScoreDiv.appendChild(scoreBreakdown);

    const infoIcon = priorityScoreDiv.querySelector(".info-icon");
    infoIcon.addEventListener("mouseenter", () => {
      scoreBreakdown.style.display = "block";
    });
    infoIcon.addEventListener("mouseleave", () => {
      scoreBreakdown.style.display = "none";
    });

    const actionArea = resultDiv.getElementsByClassName("btns-div")[0];
    actionArea.appendChild(ignoreBtn);
    actionArea.appendChild(generateBtn);

    ignoreBtn.onclick = (event) => {
      event.stopPropagation();
      result.status = result.status === "Ignore" ? "" : "Ignore";
      log?.(`ignore, ${result.status}`);
      renderFunctionResults(orderedResults, targetContainer, priority, options);
    };

    if (result.status === "HarnessGenerated") {
      generateBtn.disabled = true;
      generateBtn.textContent = "Harness Exists";
    }

    generateBtn.onclick = (event) => {
      event.stopPropagation();
      if (!fuzzRootSelected) {
        log?.("No fuzz root selected, cannot generate harness.");
        return;
      }
      log?.("generate");
      sendMessage?.({
        command: "generateHarness",
        fuzzRoot: fuzzRootSelected,
        target: result,
      });
      result.status = "HarnessGenerated";
      result.harnessTargetName = `fuzz_target_${result.functionName}`;
      generateBtn.disabled = true;
      generateBtn.textContent = "Harness Exists";
      onStatusChange?.(result);
      renderFunctionResults(orderedResults, targetContainer, priority, options);
    };

    resultDiv.onclick = () => {
      if (result.functionLocation) {
        sendMessage?.({
          command: "openLocation",
          filePath: result.functionLocation.filePath,
          offset: result.functionLocation.offset,
        });
      }
    };

    targetContainer.appendChild(resultDiv);
  }
}

export function loadFilters(
  functionTargets,
  targetContainer,
  functionListDiv,
  options
) {
  const { onFilterChange, selectedFilter } = options;
  targetContainer.innerHTML = "";
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
    
    const wrapper = document.createElement("span");
    wrapper.appendChild(button);
    filterButtonsContainer.appendChild(wrapper);

    if (filter.default && !selectedFilter) {
      button.classList.add("selected-filter");
      onFilterChange?.(filter.id);
    } else if (selectedFilter === filter.id) {
      button.classList.add("selected-filter");
    }

    button.addEventListener("click", () => {
      const previous = targetContainer.querySelector(".selected-filter");
      previous?.classList.remove("selected-filter");
      button.classList.add("selected-filter");
      onFilterChange?.(filter.id);
      startRendering(functionTargets, functionListDiv, filter.id, options);
    });
  });

  targetContainer.appendChild(filterButtonsContainer);
}
