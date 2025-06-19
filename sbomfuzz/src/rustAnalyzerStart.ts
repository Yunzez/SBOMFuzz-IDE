import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as cp from "child_process";
import { loadFunctionResults } from "./functionOutputProcesser";

export function runRustAnalyzer(
  context: vscode.ExtensionContext,
  projectPath: string,
  webview: vscode.Webview
) {
  vscode.window.showInformationMessage(
    "Starting Rust analyzer, this may take a while"
  );
  const binary_name = get_platform_specific_binary();
  if (binary_name === undefined) { return }
  const binaryPath = path.join(context.extensionPath, "core", binary_name);

  const outputPath = path.join(context.extensionPath, "output");

  // Clear the output directory if it exists, then recreate it
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { recursive: true, force: true });
  }
  fs.mkdirSync(outputPath, { recursive: true });

  const args = ["function-analysis", projectPath, outputPath];

  const proc = cp.spawn(binaryPath, args, {
    cwd: projectPath,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  proc.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  proc.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  proc.on("close", (code) => {
    if (code === 0) {
      vscode.window.showInformationMessage(
        "Rust analyzer finished successfully, processing results..."
      );

      console.log("[ext] Sending rustAnalysisDone to webview", outputPath);

      // Optionally send result to webview
      console.log(stdout);
      // ✅ Send message to webview
      const results = loadFunctionResults(outputPath) ?? [];
      console.log("Loaded function results:", results);

      webview.postMessage({
        command: "rustAnalysisDone",
        results
      });
    } else {
      vscode.window.showErrorMessage(`Rust analyzer failed: ${stderr}`);
    }
  });
}


function get_platform_specific_binary() {
  console.log("PLATFORM: ", process.platform);
  switch(process.platform) {
    case "win32":
      return "rust-analyzer-win32.exe"
    case "linux":
      return "rust-analyzer-linux"
    case "darwin":
      return "rust-analyzer-darwin"
    default:
      console.log("UNKNOWN PLATFORM: ", process.platform)
      return undefined
  }
}