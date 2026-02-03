function renderSearchBar(results, targetContainer, priority, options) {
  const { log } = options;
  const searchContainer = document.createElement("div");
  searchContainer.style.marginBottom = "10px";
  searchContainer.style.width = "100%";
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
    onHarnessDeleted,
  } = options;

  targetContainer.innerHTML = "";
  const filteredResults =
    priority === "unsafe-block-filter"
      ? results.filter((r) => r.unsafeScore > 0)
      : priority === "harness-filter"
        ? results.filter(
            (r) =>
              r.status === "HarnessGenerated" ||
              Boolean(r.harnessPath || r.harnessTargetName)
          )
        : results;
  const nonIgnored = filteredResults.filter((r) => r.status !== "Ignore");
  const ignored = filteredResults.filter((r) => r.status === "Ignore");
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
    const scoreLabel =
      priority === "unsafe-block-filter"
        ? "Unsafe Block"
        : priority === "parameters-filter"
          ? "Parameters Count"
          : priority === "usage-filter"
            ? "Usage Count"
            : "Priority Score";
    const scoreValue =
      priority === "unsafe-block-filter"
        ? result.unsafeScore > 0
          ? "Yes"
          : "No"
        : priority === "parameters-filter"
          ? result.paramCount
          : priority === "usage-filter"
            ? result.usageCount
            : result.priorityScore.toFixed(3);

    const ignoreBtn = document.createElement("button");
    ignoreBtn.textContent = result.status !== "Ignore" ? "Ignore" : "Unignore";
    ignoreBtn.className = "negative-button";

    const generateBtn = document.createElement("button");
    const isGenerated = result.status === "HarnessGenerated";
    const isPending = Boolean(result.pendingGeneration);
    generateBtn.className = "affirmative-button";
    generateBtn.style.marginLeft = "4px";
    if (isGenerated) {
      generateBtn.textContent = "Jump to Harness";
      if (result.harnessPath) {
        generateBtn.disabled = false;
        generateBtn.onclick = (event) => {
          event.stopPropagation();
          sendMessage?.({
            command: "openLocation",
            filePath: result.harnessPath,
            offset: 0,
          });
        };
      } else {
        generateBtn.disabled = true;
      }
    } else if (isPending) {
      generateBtn.textContent = "Generating...";
      generateBtn.disabled = true;
    } else {
      generateBtn.textContent = "Generate Harness";
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
        result.pendingGeneration = true;
        generateBtn.disabled = true;
        generateBtn.textContent = "Generating...";
        onStatusChange?.({
          functionKey: result.functionKey,
          pendingGeneration: true,
        });
        renderFunctionResults(
          orderedResults,
          targetContainer,
          priority,
          options
        );
      };
    }

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
        ${scoreLabel}: ${scoreValue}
        <span
          class="info-icon"
          style="margin-left: 4px; cursor: pointer;"
          title="Hover to see score breakdown"
        >ℹ️</span>
      </div>
      <div class="btns-div" style="margin-top:3px;"></div>
      <div class="harness-actions" style="margin-top:6px;"></div>
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
    const harnessActionArea =
      resultDiv.getElementsByClassName("harness-actions")[0];
    actionArea.appendChild(ignoreBtn);
    actionArea.appendChild(generateBtn);

    if (isGenerated && result.harnessTargetName) {
      const runBtn = document.createElement("button");
      runBtn.textContent = "Run";
      runBtn.className = `affirmative-button ${result.harnessTargetName}-run-btn`;
      runBtn.style.marginLeft = "4px";

      const stopBtn = document.createElement("button");
      stopBtn.textContent = "Close";
      stopBtn.className = `negative-button ${result.harnessTargetName}-stop-btn`;
      stopBtn.style.marginLeft = "4px";
      stopBtn.style.display = "none";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = `negative-button ${result.harnessTargetName}-delete-btn`;
      deleteBtn.style.marginLeft = "4px";

      runBtn.onclick = (event) => {
        event.stopPropagation();
        log?.(`Running fuzz target: ${result.harnessTargetName}`);
        sendMessage?.({ command: "runFuzzTarget", target: result.harnessTargetName });
        stopBtn.style.display = "inline-block";
        runBtn.style.display = "none";
      };

      stopBtn.onclick = (event) => {
        event.stopPropagation();
        log?.("Stopping fuzz target.");
        sendMessage?.({ command: "stopFuzzTarget" });
        stopBtn.style.display = "none";
        runBtn.style.display = "inline-block";
      };

      deleteBtn.onclick = (event) => {
        event.stopPropagation();
        log?.(`Deleting fuzz target: ${result.harnessTargetName}`);
        sendMessage?.({ command: "deleteFuzzTarget", target: result.harnessTargetName });
        onHarnessDeleted?.({
          functionKey: result.functionKey,
          targetName: result.harnessTargetName,
        });
        if (fuzzRootSelected) {
          sendMessage?.({ command: "getFuzzTargets", fuzzRoot: fuzzRootSelected });
        }
      };

      harnessActionArea.appendChild(runBtn);
      harnessActionArea.appendChild(stopBtn);
      harnessActionArea.appendChild(deleteBtn);
    }

    ignoreBtn.onclick = (event) => {
      event.stopPropagation();
      result.status = result.status === "Ignore" ? "" : "Ignore";
      log?.(`ignore, ${result.status}`);
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
  const { onFilterChange, selectedFilter, getFunctionTargets } = options;
  targetContainer.innerHTML = "";
  const filterTitle = document.createElement("div");
  filterTitle.textContent = "Order By";
  filterTitle.style.fontWeight = "bold";
  filterTitle.style.marginBottom = "8px";
  filterTitle.style.marginTop = "8px";
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
    {
      id: "harness-filter",
      label: "Has Harness",
      default: false,
      filterDescription: "Show only functions with generated harnesses.",
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
      const latestResults = getFunctionTargets?.() || functionTargets;
      startRendering(latestResults, functionListDiv, filter.id, options);
    });
  });

  targetContainer.appendChild(filterButtonsContainer);
}
