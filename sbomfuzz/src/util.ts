import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as toml from "toml";
import dotenv from "dotenv";
const execSync = require("child_process").execSync;
dotenv.config();

// this is used to process abruptive events such as failure or error
export enum globalBroadcastEventType {
  HarnessStarted = "HarnessStarted",
  HarnessStopped = "HarnessStopped",
  HarnessFailed = "HarnessFailed",
  HarnessOptimized = "HarnessOptimized",
  UpdateFunctionStatus = "UpdateFunctionStatus",
}
export function findCargoProjectRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    return;
  }

  for (const folder of folders) {
    const folderPath = folder.uri.fsPath;
    const cargoPath = path.join(folderPath, "Cargo.toml");
    if (fs.existsSync(cargoPath)) {
      return folderPath;
    }
  }

  return;
}

export function findFuzzRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    return;
  }

  for (const folder of folders) {
    const folderPath = folder.uri.fsPath;
    const fuzzPath = path.join(folderPath, "fuzz", "Cargo.toml");
    if (fs.existsSync(fuzzPath)) {
      return path.join(folderPath, "fuzz");
    }
  }

  return;
}

export function getFuzzTargets(
  fuzzDir: string
): { name: string; path: string }[] {
  const cargoTomlPath = path.join(fuzzDir, "Cargo.toml");
  if (!fs.existsSync(cargoTomlPath)) {
    console.error("❌ Missing fuzz/Cargo.toml");
    return [];
  }

  const fuzzDirWithSlash = fuzzDir.endsWith(path.sep)
    ? fuzzDir
    : fuzzDir + path.sep;
  try {
    const output = execSync("cargo fuzz list", {
      cwd: fuzzDir,
      encoding: "utf8",
    });
    return output
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .map((name: string) => ({
        name,
        path: fuzzDirWithSlash + "fuzz_targets/" + name + ".rs",
        target_function: name.replace("fuzz_target_", "").trim(),
      }));
  } catch (err) {
    console.error("❌ Failed to run cargo fuzz list:", err);
    return [];
  }
}

export function waitForDir(dir: string, timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (fs.existsSync(dir)) {
        clearInterval(interval);
        resolve(true);
      }
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      resolve(false);
    }, timeout);
  });
}
