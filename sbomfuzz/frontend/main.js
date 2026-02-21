import { setupMessaging, sendMessage, log } from "./messaging.js";
import { startRendering, loadFilters } from "./functionList.js";

let pathSelected = null;
let fuzzRootSelected = null;
let functionTargets = null;
let selectedFilter = null;
let harnessFilter = "all";
const targetContainer = document.getElementById("entry-list");
const pathDiv = document.getElementById("path-display-container");
let filtersContainer = null;
let functionListContainer = null;

function createRenderOptions(overrides = {}) {
  return {
    fuzzRootSelected,
    pathSelected,
    sendMessage,
    log,
    onStatusChange: handleStatusChange,
    selectedFilter,
    onHarnessDeleted: handleHarnessDeleted,
    getFunctionTargets: () => functionTargets,
    getHarnessFilter: () => harnessFilter,
    harnessFilter,
    ...overrides,
  };
}

function handleStatusChange(updated) {
  if (!functionTargets) {
    return;
  }
  const index = functionTargets.findIndex(
    (fn) => fn.functionKey === updated.functionKey
  );
  if (index !== -1) {
    functionTargets[index] = {
      ...functionTargets[index],
      ...updated,
    };
  }
}

function handleFilterChange(filterId) {
  selectedFilter = filterId;
}

function handleHarnessFilterChange(filterId) {
  harnessFilter = filterId;
}

function handleHarnessDeleted(payload) {
  if (!functionTargets || functionTargets.length === 0) {
    return;
  }
  const targetName =
    typeof payload === "string" ? payload : payload?.targetName;
  const functionKey =
    typeof payload === "object" && payload ? payload.functionKey : null;
  let changed = false;
  functionTargets = functionTargets.map((fn) => {
    if (
      (functionKey && fn.functionKey === functionKey) ||
      (targetName && fn.harnessTargetName === targetName)
    ) {
      changed = true;
      const updated = { ...fn };
      updated.status = "No Harness";
      delete updated.harnessTargetName;
      delete updated.harnessPath;
      delete updated.pendingGeneration;
      return updated;
    }
    return fn;
  });

  if (!changed) {
    return;
  }

  const listTarget = functionListContainer || targetContainer;
  if (!listTarget) {
    return;
  }

  const activeFilter = selectedFilter || "priority-filter";
  startRendering(
    functionTargets,
    listTarget,
    activeFilter,
    createRenderOptions()
  );
}

function handleFunctionStatusUpdate(event) {
  if (!functionTargets || !event?.functionKey) {
    return;
  }

  const index = functionTargets.findIndex(
    (fn) => fn.functionKey === event.functionKey
  );

  if (index === -1) {
    return;
  }

  const updated = { ...functionTargets[index] };

  if (event.status) {
    updated.status = event.status;

    if (event.status === "HarnessGenerated") {
      if (event.harnessPath) {
        updated.harnessPath = event.harnessPath;
      }
      if (event.harnessTargetName) {
        updated.harnessTargetName = event.harnessTargetName;
      }
      if (typeof event.harnessOptimized === "boolean") {
        updated.harnessOptimized = event.harnessOptimized;
      }
    } else {
      delete updated.harnessPath;
      delete updated.harnessTargetName;
      delete updated.harnessOptimized;
    }

    delete updated.pendingGeneration;
  }

  if (typeof event.pendingGeneration === "boolean") {
    if (event.pendingGeneration) {
      updated.pendingGeneration = true;
    } else {
      delete updated.pendingGeneration;
    }
  }

  if (typeof event.harnessOptimized === "boolean") {
    updated.harnessOptimized = event.harnessOptimized;
  }

  functionTargets[index] = updated;

  const listTarget = functionListContainer || targetContainer;
  if (!listTarget) {
    return;
  }

  const activeFilter = selectedFilter || "priority-filter";
  startRendering(
    functionTargets,
    listTarget,
    activeFilter,
    createRenderOptions()
  );
}

setupMessaging({
  onFuzzTargetsListed: (targets) => {
    log("🧪 Fuzz targets listed:", targets);
    if (!functionTargets || functionTargets.length === 0) {
      return;
    }
    const byFunctionKey = new Map(
      targets.filter((t) => t.functionKey).map((t) => [t.functionKey, t])
    );
    let changed = false;
    functionTargets = functionTargets.map((fn) => {
      const match = byFunctionKey.get(fn.functionKey);
      if (match) {
        const updated = { ...fn };
        updated.status = "HarnessGenerated";
        updated.harnessTargetName = match.name;
        updated.harnessPath = match.path;
        delete updated.pendingGeneration;
        if (typeof updated.harnessOptimized !== "boolean") {
          updated.harnessOptimized = true;
        }
        changed = true;
        return updated;
      }
      return fn;
    });
    if (!changed) {
      return;
    }
    const activeFilter = selectedFilter || "priority-filter";
    const listTarget = functionListContainer || targetContainer;
    startRendering(
      functionTargets,
      listTarget,
      activeFilter,
      createRenderOptions()
    );
  },

  onRustAnalysisDone: (results) => {
    log("Rendering function results");
    functionTargets = results;
    const activeFilter = selectedFilter || "priority-filter";
    const listTarget = functionListContainer || targetContainer;
    if (filtersContainer && functionListContainer) {
      loadFilters(
        functionTargets,
        filtersContainer,
        functionListContainer,
        createRenderOptions({
          onFilterChange: handleFilterChange,
          onHarnessFilterChange: handleHarnessFilterChange,
          selectedFilter,
          harnessFilter,
        })
      );
    }
    startRendering(
      functionTargets,
      listTarget,
      activeFilter,
      createRenderOptions()
    );
  },

  onGlobalContext: (context) => {
    log("Global context received:", context.projectRoot);
    const projectRootPath = context.projectRoot;
    if (projectRootPath) {
      log("📦 Got Cargo project root: " + projectRootPath);
      pathSelected = projectRootPath;

      pathDiv.innerHTML = `
      <div class="root-container root-link" id="project-root-link">
        <span class="root-label">Project Root</span>
        <span class="root-path">${projectRootPath}</span>
        <span class="root-action">Reveal</span>
      </div>
      `;
      document
        .getElementById("project-root-link")
        ?.addEventListener("click", () => {
          sendMessage({
            command: "revealPath",
            path: projectRootPath,
          });
        });
    } else {
      pathDiv.innerHTML = `
      <div style="padding: 8px;  border-radius: 4px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <span style="font-weight: bold; color: #cc0000;">No Cargo project found.</span>
      </div>
      `;
    }

    const fuzzPathDiv = document.getElementById("fuzz-path-display");
    const fuzzRootPath = context.fuzzRoot;
    if (fuzzRootPath) {
      log("🧪 Got Fuzz root: " + fuzzRootPath);
      fuzzRootSelected = fuzzRootPath;
      fuzzPathDiv.innerHTML = `
      <div class="root-container root-link" id="fuzz-root-link">
        <span class="root-label">Fuzz Root</span>
        <span class="root-path">${fuzzRootPath}</span>
        <span class="root-action">Reveal</span>
      </div>`;
      document
        .getElementById("fuzz-root-link")
        ?.addEventListener("click", () => {
          sendMessage({
            command: "revealPath",
            path: fuzzRootPath,
          });
        });
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
    if (!filtersContainer) {
      filtersContainer = document.createElement("div");
      filtersContainer.id = "filters-container";
      targetContainer.appendChild(filtersContainer);
    } else {
      filtersContainer.innerHTML = "";
    }

    if (!functionListContainer) {
      functionListContainer = document.createElement("div");
      targetContainer.appendChild(functionListContainer);
    } else {
      functionListContainer.innerHTML = "";
    }
    if (context.results && context.results.length > 0) {
      functionTargets = context.results;
      loadFilters(
        functionTargets,
        filtersContainer,
        functionListContainer,
        createRenderOptions({
          onFilterChange: handleFilterChange,
          onHarnessFilterChange: handleHarnessFilterChange,
          selectedFilter,
          harnessFilter,
        })
      );
      const activeFilter = selectedFilter || "priority-filter";
      startRendering(
        functionTargets,
        functionListContainer,
        activeFilter,
        createRenderOptions()
      );
    }
  },

  onUpdateFunctionStatus: handleFunctionStatusUpdate,
});

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
