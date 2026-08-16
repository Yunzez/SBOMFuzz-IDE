import * as fs from "fs";
import * as path from "path";
import { OpenAI } from "openai";
import { spawn, ChildProcess } from "child_process";
import * as vscode from "vscode";
import { channel_log } from "./extension";
import { globalBroadcastEventType } from "./util";
import { getGlobalContext } from "./globalContextProvider";
import { FunctionResult, FunctionStatus } from "./functionOutputProcesser";
import {
  getHarnessRecordByTargetName,
  registerHarnessForFunction,
  removeHarnessRecordByTargetName,
  setHarnessOptimized,
} from "./harnessRegistry";
import kill from "tree-kill";
import { refreshCodeLenses } from "./rustFunctionCodeLensProvider";

function createOpenAIClient(): OpenAI | null {
  const cfg = vscode.workspace.getConfiguration("fuzzlens");
  let apiKey = cfg.get<string>("apiKey");
  const apiBaseUrl = cfg.get<string>("apiBaseUrl");
  channel_log("Using API key: " + (apiKey ? "set" : "not set"));
  if (!apiKey) {
    vscode.window.showWarningMessage(
      'Set "fuzzlens.apiKey" in Settings or export API_KEY.'
    );
    return null;
  }
  apiKey = apiKey.replace(/^['"]|['"]$/g, "");
  return new OpenAI({ apiKey, baseURL: apiBaseUrl });
}

let harnessProcess: ChildProcess | null = null;
let harnessTerminal: vscode.Terminal | null = null;
let harnessTerminalCloseListener: vscode.Disposable | null = null;
let harnessTerminalTarget: string | null = null;
let harnessProcessTarget: string | null = null;

export function getRunningTargetName(): string | null {
  return harnessProcessTarget ?? harnessTerminalTarget;
}

export async function generateHarness(
  target: FunctionResult,
  fuzzRoot: string,
  extensionPath: string,
  basePromptRef?: { prompt?: string }
): Promise<{ success: boolean; targetPath?: string; message?: string }> {
  channel_log("Generating harness...");
  const targetName = `fuzz_target_${target.functionName}`;
  const harnessFilePath = path.join(
    fuzzRoot,
    "fuzz_targets",
    `${targetName}.rs`
  );

  const promptPath = path.join(extensionPath, "src", "prompt.txt");
  console.log("prompt path", promptPath);

  if (!fs.existsSync(promptPath)) {
    console.error("Missing prompt.txt");
    channel_log("Missing prompt.txt");
    return { success: false, message: "Missing prompt.txt" };
  }

  const formatParameters = () => {
    const params = target.functionParameters;
    if (params && typeof params === "object") {
      try {
        return JSON.stringify(params);
      } catch {
        return String(params);
      }
    }
    if (typeof target.paramCount === "number") {
      return `<unknown> (count: ${target.paramCount})`;
    }
    return "<unknown>";
  };

  const functionUsage = "";

  const extractSignature = () => {
    const filePath = target?.functionLocation?.filePath;
    const functionName = target?.functionName;
    if (!filePath || !functionName) {
      return "";
    }
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const signatureLines: string[] = [];
      let capturing = false;
      for (const line of lines) {
        if (!capturing) {
          if (new RegExp(`\\bfn\\s+${functionName}\\b`).test(line)) {
            capturing = true;
          } else {
            continue;
          }
        }
        signatureLines.push(line.trim());
        if (line.includes("{") || line.includes(";")) {
          break;
        }
        if (signatureLines.join(" ").length > 400) {
          break;
        }
      }
      return signatureLines.join(" ");
    } catch {
      return "";
    }
  };

  const signature = extractSignature();

  const functionInfo =
    [
      `Function: ${target.functionName || ""}`,
      `Crate: ${target.functionCrate || ""}`,
      `Possible Module Path: ${target.functionModulePath || ""}`,
      signature ? `Signature: ${signature}` : "",
      `Description: ${target.functionDescription || ""}`,
      `Parameters: ${formatParameters()}`,
      functionUsage ? `function_usage: ${functionUsage}` : "",
    ]
      .filter(Boolean)
      .join("\n") + "\n";

  // Add your harness generation logic here
  let template = fs.readFileSync(promptPath, "utf8");
  template = template
    .replace(/<fuzzer>/g, "cargo-fuzz")
    .replace(/<function-info>/g, functionInfo);
  console.log("Generated harness template:", template);
  if (basePromptRef) {
    basePromptRef.prompt = template;
  }
  channel_log("trigger generation with OpenAI...");

  const result = await generateHarnessFromPrompt(template, extensionPath);
  if (!result) {
    return { success: false };
  }
  fs.writeFileSync(harnessFilePath, result);
  console.log(
    "✅ Harness written to:",
    harnessFilePath,
    "adding to Cargo.toml"
  );

  const cargoTomlPath = path.join(fuzzRoot, "Cargo.toml");
  // Prepare the entry as an array and join with newlines for neatness
  const cargoTomlEntry = [
    "",
    "[[bin]]",
    `name = "${targetName}"`,
    `path = "fuzz_targets/${targetName}.rs"`,
    "test = false",
    "doc = false",
    "bench = false",
  ].join("\n");

  // Avoid duplication
  const existingToml = fs.readFileSync(cargoTomlPath, "utf8");
  if (!existingToml.includes(`name = "${targetName}"`)) {
    fs.appendFileSync(cargoTomlPath, cargoTomlEntry);
    console.log(`✅ Appended new bin entry to Cargo.toml for ${targetName}`);
  } else {
    console.log(`ℹ️ Bin entry for ${targetName} already exists in Cargo.toml`);
  }

  return { success: true, targetPath: harnessFilePath };
}

async function generateHarnessFromPrompt(
  prompt: string,
  _extensionPath: string
): Promise<string | null> {
  channel_log("Generating harness with OpenAI...");
  const openai = createOpenAIClient();
  if (!openai) {
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      // model: "gpt-5-nano-2025-08-07",
      model: "gpt-5-2025-08-07",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant specialized in Rust fuzzing harness generation, stick to the template and be concise.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
    });

    // Extract code block content from response, ignoring ``` and language
    const match = response.choices[0].message.content?.match(
      /```(?:\w+)?\s*([\s\S]*?)\s*```/
    );
    const output = match
      ? match[1].trim()
      : response.choices[0].message.content;
    return output ?? null;
  } catch (err) {
    console.error("⚠️ OpenAI API error:", err);
    return null;
  }
}

/**
 * Optimizes a fuzzing harness by running a single fuzzing attempt and capturing any errors.
 *
 * @param target - The target object containing information about the fuzz target, including the function name.
 * @param root - The fuzz directory path.
 * @param filePath - The path to the file containing the fuzz target.
 * @param extensionPath - The path to this extension directory.
 */
export async function optimizeHarness(
  target: FunctionResult,
  root: string,
  filePath: string,
  extensionPath: string,
  iteration: number = 0,
  basePrompt?: string,
  onAttempt?: (attempt: number, total: number) => void
): Promise<{ success: boolean }> {
  iteration++;
  onAttempt?.(iteration, 3);
  const targetName = `fuzz_target_${target.functionName}`;
  const openai = createOpenAIClient();
  if (!openai) {
    return { success: false };
  }

  console.log(`🔁 Running fuzz attempt #${iteration}`);

  const runHarnessBuild = (): Promise<{ stderr: string; code: number | null }> =>
    new Promise((resolve) => {
      const proc = spawn("cargo", ["fuzz", "build", targetName], {
        cwd: root,
        env: {
          ...process.env,
          RUSTFLAGS: "-Awarnings",
        },
      });

      let stderr = "";
      proc.stderr.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (!line.toLowerCase().includes("warning")) {
            stderr += line + "\n";
          }
        }
      });

      proc.on("close", (code) => {
        resolve({ stderr, code });
      });
    });

  const { stderr: errorOutput, code } = await runHarnessBuild();
  console.log("Harness run output:", errorOutput);

  if (code === 0) {
    console.log("Yay! Harness ran without errors!");
    return { success: true };
  }

  if (iteration > 2) {
    console.error("❌ Maximum optimization attempts reached");
    return { success: false };
  }

  // Read prompt and inject error/code into it
  const originalCode = fs.readFileSync(filePath, "utf8");
  const promptPath = path.join(extensionPath, "src", "optimize.txt");

  if (!fs.existsSync(promptPath)) {
    console.error("Missing optimize.txt");
    return { success: false };
  }

  let template = fs.readFileSync(promptPath, "utf8");
  const combinedPrompt = basePrompt
    ? `${basePrompt}\n\n# Fix Harness\n`
    : "";
  template = template
    .replace(/<HARNESS-CODE>/g, originalCode)
    .replace(/<ERROR-LOG>/g, errorOutput)
    .replace(/<BASE-PROMPT>/g, combinedPrompt);
  if (!template.includes(combinedPrompt)) {
    template = `${combinedPrompt}${template}`;
  }
  if (combinedPrompt) {
    console.log("Fix harness base prompt:", combinedPrompt);
  }

  try {
    const response = await openai.chat.completions.create({
      // model: "gpt-5-nano-2025-08-07",
      model: "gpt-5-2025-08-07",
      messages: [{ role: "user", content: template }],
      temperature: 1,
    });

    const fixedCode = response.choices?.[0]?.message?.content;
    if (!fixedCode) {
      console.error("❌ No valid response from OpenAI");
      return { success: false };
    }

    const cleaned = stripMarkdownCodeBlock(fixedCode);
    fs.writeFileSync(filePath, cleaned);
    console.log("new harness code:", cleaned);
    console.log(`✍️ Rewritten harness, retrying (iteration ${iteration})...`);

    // RECURSE
    return optimizeHarness(
      target,
      root,
      filePath,
      extensionPath,
      iteration,
      basePrompt,
      onAttempt
    );
  } catch (err) {
    console.error("❌ Error optimizing harness:", err);
    return { success: false };
  }
}

export async function assessHarness(
  targetName: string,
  root: string
): Promise<{ success: boolean; errorOutput?: string }> {
  const outputChannel = vscode.window.createOutputChannel("Fuzz Harness");
  outputChannel.show(true);
  return new Promise((resolve) => {
    const proc = spawn("cargo", ["fuzz", "build", targetName], {
      cwd: root,
      env: {
        ...process.env,
        RUSTFLAGS: "-Awarnings",
      },
    });
    let stderr = "";
    proc.stdout.on("data", (data) => {
      outputChannel.append(data.toString());
    });
    proc.stderr.on("data", (data) => {
      const chunk = data.toString();
      outputChannel.append(chunk);
      stderr += chunk;
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, errorOutput: stderr });
      }
    });
  });
}

export function removeBinEntryFromToml(
  tomlContent: string,
  targetName: string
): { result: string; found: boolean } {
  const lines = tomlContent.split("\n");
  const newLines: string[] = [];
  let insideBin = false;
  let binBuffer: string[] = [];
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "[[bin]]") {
      if (insideBin && binBuffer.length > 0) {
        const nameLine = binBuffer.find((l) => l.trim().startsWith("name ="));
        if (nameLine && nameLine.includes(`"${targetName}"`)) {
          found = true;
        } else {
          newLines.push(...binBuffer);
        }
        binBuffer = [];
      }
      insideBin = true;
      binBuffer = [line];
    } else if (insideBin) {
      binBuffer.push(line);
      if (i === lines.length - 1 || lines[i + 1].trim() === "[[bin]]") {
        const nameLine = binBuffer.find((l) => l.trim().startsWith("name ="));
        if (nameLine && nameLine.includes(`"${targetName}"`)) {
          found = true;
        } else {
          newLines.push(...binBuffer);
        }
        binBuffer = [];
        insideBin = false;
      }
    } else {
      newLines.push(line);
    }
  }
  if (binBuffer.length > 0) {
    const nameLine = binBuffer.find((l) => l.trim().startsWith("name ="));
    if (nameLine && nameLine.includes(`"${targetName}"`)) {
      found = true;
    } else {
      newLines.push(...binBuffer);
    }
  }

  return { result: newLines.join("\n"), found };
}

export function deleteSelectedHarness(targetName: string, root: string): void {
  const harnessFilePath = path.join(root, "fuzz_targets", `${targetName}.rs`);
  const cargoTomlPath = path.join(root, "Cargo.toml");
  const registryRecord = getHarnessRecordByTargetName(targetName);
  if (fs.existsSync(harnessFilePath)) {
    fs.unlinkSync(harnessFilePath);
    console.log(`🗑️ Deleted harness file: ${harnessFilePath}`);
  } else {
    console.log(`ℹ️ Harness file not found: ${harnessFilePath}`);
  }

  if (fs.existsSync(cargoTomlPath)) {
    const tomlContent = fs.readFileSync(cargoTomlPath, "utf8");
    const { result, found } = removeBinEntryFromToml(tomlContent, targetName);
    if (found) {
      fs.writeFileSync(cargoTomlPath, result);
      console.log(`🗑️ Removed [[bin]] entry for ${targetName} from Cargo.toml`);
    } else {
      console.log(`ℹ️ No [[bin]] entry found for ${targetName} in Cargo.toml`);
    }
  } else {
    console.log(`ℹ️ Cargo.toml not found at: ${cargoTomlPath}`);
  }

  removeHarnessRecordByTargetName(targetName);
  setHarnessOptimized(targetName, false);

  const globalContext = getGlobalContext();
  if (registryRecord && globalContext?.results) {
    const match = globalContext.results.find(
      (fn) => fn.functionKey === registryRecord.functionKey
    );
    if (match) {
      match.status = FunctionStatus.NoHarness;
      delete match.harnessPath;
      delete match.harnessTargetName;
    }
  }
}

function cleanupHarnessTerminal(): void {
  if (harnessTerminalCloseListener) {
    harnessTerminalCloseListener.dispose();
    harnessTerminalCloseListener = null;
  }
  harnessTerminal = null;
  harnessTerminalTarget = null;
}

export function runSelectedHarness(targetName: string, root: string): void {
  const outputChannel = vscode.window.createOutputChannel("Fuzz Harness");
  outputChannel.show(true);

  let buffer = "";
  let flushTimer: NodeJS.Timeout | null = null;

  function enqueue(data: Buffer) {
    buffer += data.toString();
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        outputChannel.append(buffer);
        buffer = "";
        flushTimer = null;
      }, 1000); // flush once per second
    }
  }

  const proc = spawn("cargo", ["fuzz", "run", targetName], {
    cwd: root,
    env: {
      ...process.env,
      RUSTFLAGS: "-Awarnings",
    },
  });

  if (!proc.pid) {
    vscode.window.showErrorMessage("Failed to start harness process.");
    return;
  } else if (harnessProcess) {
    vscode.window.showWarningMessage(
      `Another harness (${harnessProcess.pid}) is already running. Stop it first.`
    );
    return;
  }
  harnessProcess = proc;
  harnessProcessTarget = targetName;
  refreshCodeLenses();

  outputChannel.appendLine(`▶️ Running harness: ${targetName}\n`);

  // proc.stdout.on("data", (data) => {
  //   outputChannel.append(data.toString());
  // });

  // proc.stderr.on("data", (data) => {
  //   outputChannel.append(data.toString());
  // });
  proc.stdout.on("data", enqueue);
  proc.stderr.on("data", enqueue);

  proc.on("error", (err) => {
    outputChannel.appendLine(`❌ Error running harness: ${err.message}`);
    vscode.window.showErrorMessage(`Harness process failed: ${err.message}`);
    vscode.commands.executeCommand("fuzzlens.broadcast", {
      name: targetName,
      eventType: globalBroadcastEventType.HarnessFailed,
    });

    harnessProcess = null;
    harnessProcessTarget = null;
    refreshCodeLenses();
  });

  proc.on("close", (code, signal) => {
    outputChannel.appendLine(
      `\n🔚 Fuzzing process exited with code ${code}, signal ${signal}`
    );
    if (code !== 0) {
      vscode.window.showWarningMessage(
        `⚠️ Fuzzing process crashed or exited with error (code ${code}).`
      );
    } else {
      vscode.window.showInformationMessage(`✅ Fuzzing completed.`);
    }

    vscode.commands.executeCommand("fuzzlens.broadcast", {
      name: targetName,
      eventType: globalBroadcastEventType.HarnessFailed,
    });

    harnessProcess = null;
    harnessProcessTarget = null;
    refreshCodeLenses();
  });
}

export async function runSelectedHarnessGUI(
  targetName: string,
  root: string
): Promise<void> {
  if (harnessProcess || harnessTerminal) {
    const choice = await vscode.window.showWarningMessage(
      "A harness run is already active. Stop it and run this one?",
      { modal: true },
      "Stop and Run"
    );
    if (choice !== "Stop and Run") {
      return;
    }
    await stopHarness();
  }

  const terminal = vscode.window.createTerminal({
    name: `Fuzz Harness GUI (${targetName})`,
    cwd: root,
    env: {
      ...process.env,
      RUSTFLAGS: "-Awarnings",
    },
  });

  harnessTerminal = terminal;
  harnessTerminalTarget = targetName;
  refreshCodeLenses();
  const terminalTarget = targetName;
  harnessTerminalCloseListener = vscode.window.onDidCloseTerminal(
    (closedTerminal) => {
      if (closedTerminal !== terminal) {
        return;
      }

      const exitCode = closedTerminal.exitStatus?.code;
      cleanupHarnessTerminal();
      refreshCodeLenses();

      vscode.commands.executeCommand("fuzzlens.broadcast", {
        name: terminalTarget,
        eventType: globalBroadcastEventType.HarnessStopped,
      });

      if (exitCode !== undefined && exitCode !== 0) {
        vscode.window.showWarningMessage(
          `⚠️ Fuzz harness ${
            terminalTarget ?? ""
          } terminal closed with error code ${exitCode}.`
        );
      } else {
        vscode.window.showInformationMessage(
          `🔚 Fuzz harness ${terminalTarget ?? ""} terminal closed.`
        );
      }
    }
  );

  vscode.commands.executeCommand("fuzzlens.broadcast", {
    name: targetName,
    eventType: globalBroadcastEventType.HarnessStarted,
  });
  vscode.window.showInformationMessage(
    `▶️ Opening LibAFL GUI for harness ${targetName} in the integrated terminal.`
  );
  terminal.show(true);
  terminal.sendText(`cargo fuzz run ${targetName}`);
}

export async function stopHarness(): Promise<void> {
  if (harnessProcess) {
    const pid = harnessProcess.pid;
    console.log("Stopping harness process:", pid);

    // Use tree-kill to terminate the process and its children
    const stoppingTarget = harnessProcessTarget;
    await new Promise<void>((resolve) => {
      kill(pid!, "SIGINT", (err) => {
        if (err) {
          console.error("Failed to kill harness process tree:", err);
          vscode.window.showErrorMessage("Failed to stop harness process.");
        } else {
          console.log("Harness process tree killed successfully.");
          vscode.window.showInformationMessage("Harness process stopped.");
        }
        harnessProcess = null;
        harnessProcessTarget = null;
        refreshCodeLenses();
        if (stoppingTarget) {
          vscode.commands.executeCommand("fuzzlens.broadcast", {
            name: stoppingTarget,
            eventType: globalBroadcastEventType.HarnessStopped,
          });
        }
        resolve();
      });
    });
    return;
  } else {
    if (harnessTerminal) {
      const terminalToStop = harnessTerminal;
      const runningTarget = harnessTerminalTarget;
      cleanupHarnessTerminal();
      terminalToStop.dispose();
      refreshCodeLenses();
      vscode.window.showInformationMessage(
        `Harness ${runningTarget ?? ""} terminal stopped.`
      );
      if (runningTarget) {
        vscode.commands.executeCommand("fuzzlens.broadcast", {
          name: runningTarget,
          eventType: globalBroadcastEventType.HarnessStopped,
        });
      }
      return;
    }
    vscode.window.showWarningMessage(
      "No harness process is currently running."
    );
  }
}

function stripMarkdownCodeBlock(text: string): string {
  return text
    .replace(/^```[a-z]*\n/, "")
    .replace(/```$/, "")
    .trim();
}

function finalizeHarness(
  target: FunctionResult,
  targetName: string,
  targetPath: string,
  optimized: boolean
): void {
  const globalContext = getGlobalContext();
  registerHarnessForFunction(target, targetName, targetPath, { optimized });
  if (globalContext?.results) {
    const match = globalContext.results.find(
      (fn) => fn.functionKey === target.functionKey
    );
    if (match) {
      match.status = FunctionStatus.HarnessGenerated;
      match.harnessPath = targetPath;
      match.harnessTargetName = targetName;
      match.harnessOptimized = optimized;
      delete match.pendingGeneration;
    }
  }
  vscode.commands.executeCommand("fuzzlens.broadcast", {
    eventType: globalBroadcastEventType.UpdateFunctionStatus,
    functionKey: target.functionKey,
    status: FunctionStatus.HarnessGenerated,
    harnessPath: targetPath,
    harnessTargetName: targetName,
    harnessOptimized: optimized,
  });
  vscode.commands.executeCommand("fuzzlens.refreshHarnessList");
}

export function runGenerateAndOptimizeHarness(
  target: FunctionResult,
  fuzzRoot: string,
  extensionPath: string
) {
  const basePromptRef: { prompt?: string } = {};
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `FuzzLens: ${target.functionName}`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: "Generating harness…" });

      const { success, targetPath } = await generateHarness(
        target,
        fuzzRoot,
        extensionPath,
        basePromptRef
      );
      if (!success || !targetPath) {
        vscode.window.showErrorMessage("Failed to generate harness.");
        return;
      }

      progress.report({ message: "Harness generated. Compiling…" });
      vscode.window.showInformationMessage("✅ Harness generated successfully!");

      const targetName = `fuzz_target_${target.functionName}`;
      const optimized = await optimizeHarness(
        target,
        fuzzRoot,
        targetPath,
        extensionPath,
        0,
        basePromptRef.prompt,
        (attempt, total) =>
          progress.report({ message: `Compiling (attempt ${attempt} / ${total})…` })
      );

      finalizeHarness(target, targetName, targetPath, optimized.success);

      if (optimized.success) {
        progress.report({ message: "Harness ready." });
        vscode.window.showInformationMessage(
          "🚀 Harness is ready to run!",
          "Open Harness"
        ).then((selection) => {
          if (selection === "Open Harness") {
            vscode.commands.executeCommand("fuzzlens.openHarness", targetPath);
          }
        });
      } else {
        progress.report({ message: "Compilation failed after 3 attempts." });
        vscode.window.showWarningMessage(
          "⚠️ Harness failed to compile after 3 attempts.",
          "Open Harness"
        ).then((selection) => {
          if (selection === "Open Harness") {
            vscode.commands.executeCommand("fuzzlens.openHarness", targetPath);
          }
        });
      }
    }
  );
}
