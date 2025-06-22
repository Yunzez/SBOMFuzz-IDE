import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as toml from "toml";
import dotenv from "dotenv";
dotenv.config();
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


export function getFuzzTargets(fuzzDir: string): { name: string; path: string }[] {
  const cargoTomlPath = path.join(fuzzDir, "Cargo.toml");
  console.log("📦 Reading Cargo.toml at:", cargoTomlPath);
  if (!fs.existsSync(cargoTomlPath)) {
    console.error("❌ Missing fuzz/Cargo.toml");
    return [];
  }

  const tomlRaw = fs.readFileSync(cargoTomlPath, "utf8");
  const parsed = toml.parse(tomlRaw);
  const bins = parsed["bin"] || [];

  return bins
    .filter(
      (entry: any) => typeof entry.name === "string" && typeof entry.path === "string"
    )
    .map((entry: any) => ({
      name: entry.name,
      path: path.join(fuzzDir, entry.path),
    }));
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

