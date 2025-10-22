import { setupMessaging, sendMessage, log } from "./messaging.js";
import { startRendering, loadFilters } from "./functionList.js";
import { renderHarnessList } from "./harnessList.js";

let pathSelected = null;
let fuzzRootSelected = null;
let functionTargets = null;
let selectedFilter = null;
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

function handleHarnessDeleted(targetName) {
  if (!functionTargets || functionTargets.length === 0) {
    return;
  }
  let changed = false;
  functionTargets = functionTargets.map((fn) => {
    if (fn.harnessTargetName === targetName) {
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
    } else {
      delete updated.harnessPath;
      delete updated.harnessTargetName;
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
    renderHarnessList(
      targets,
      targetList,
      createRenderOptions({ onHarnessDeleted: handleHarnessDeleted })
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
          selectedFilter,
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
      <div class="root-container">
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
      fuzzPathDiv.innerHTML = `
      <div class="root-container">
        <span style="font-weight: bold; color: #333;">Fuzz Harness Root:</span>
        <span style="color: #007acc;">${fuzzRootPath}</span>
      </div>`;
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
          selectedFilter,
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
