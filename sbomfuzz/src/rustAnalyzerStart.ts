import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as cp from "child_process";

export function runRustAnalyzer(
  context: vscode.ExtensionContext,
  projectPath: string
) {

  const binaryPath = path.join(
    context.extensionPath,
    "core",
    "rust-analyzer"
  );

  const args = ["function-analysis", projectPath, "--verbose-dependency"];

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
        "Rust analyzer finished successfully."
      );
      // Optionally send result to webview
      console.log(stdout);
    } else {
      vscode.window.showErrorMessage(`Rust analyzer failed: ${stderr}`);
    }
  });
}
function acquireVsCodeApi() {
  throw new Error("Function not implemented.");
}
