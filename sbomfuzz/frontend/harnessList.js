export function renderHarnessList(targets, container, options) {
  const { fuzzRootSelected, sendMessage, log, onHarnessDeleted } = options;
  container.innerHTML = "";

  if (!targets || targets.length === 0) {
    container.innerHTML = "<div>No fuzz targets found.</div>";
    return;
  }

  targets.forEach((target) => {
    const targetDiv = document.createElement("div");

    const runBtn = document.createElement("button");
    runBtn.textContent = "Run";
    runBtn.className = `affirmative-button  ${target.name}-run-btn`;

    const stopBtn = document.createElement("button");
    stopBtn.textContent = "Stop";
    stopBtn.className = `negative-button ${target.name}-stop-btn`;
    stopBtn.style.marginLeft = "4px";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = `negative-button ${target.name}-delete-btn`;
    deleteBtn.style.marginLeft = "4px";

    targetDiv.className = "function-button";
    const relativePath = fuzzRootSelected
      ? target.path.replace(fuzzRootSelected, "")
      : target.path;
    targetDiv.innerHTML = `
      <div style="font-weight:bold; margin-bottom:4px; display: flex; gap: 6px; align-items: center;">
        ${target.name}
      </div>
      <div>
        ${relativePath}
      </div>
      <div class="btns-div" style="margin-top:3px;"></div>
    `;

    targetDiv.onclick = () => {
      sendMessage?.({
        command: "openLocation",
        filePath: target.path,
        offset: 0,
      });
    };

    const actionArea = targetDiv.getElementsByClassName("btns-div")[0];
    actionArea.appendChild(runBtn);
    actionArea.appendChild(stopBtn);
    actionArea.appendChild(deleteBtn);

    deleteBtn.onclick = (event) => {
      event.stopPropagation();
      log?.(`Deleting fuzz target: ${target.name}`);
      sendMessage?.({ command: "deleteFuzzTarget", target: target.name });
      onHarnessDeleted?.(target.name);
    };

    runBtn.onclick = (event) => {
      event.stopPropagation();
      log?.(`Running fuzz target: ${target.name}`);
      sendMessage?.({ command: "runFuzzTarget", target: target.name });
      stopBtn.style.display = "inline-block";
      runBtn.style.display = "none";
    };

    stopBtn.onclick = (event) => {
      event.stopPropagation();
      log?.(`Stopping fuzz target: ${target.name}`);
      sendMessage?.({ command: "stopFuzzTarget" });
      stopBtn.style.display = "none";
      runBtn.style.display = "inline-block";
    };

    if (target.status === "running") {
      runBtn.style.display = "none";
      stopBtn.style.display = "inline-block";
    } else {
      stopBtn.style.display = "none";
    }

    container.appendChild(targetDiv);
  });
}
