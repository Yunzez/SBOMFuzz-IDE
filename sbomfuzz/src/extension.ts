// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { SbomFuzzWebviewViewProvider } from "./view";
import {
  make_function_public,
  RustFunctionCodeLensProvider,
} from "./rustFunctionCodeLensProvider";
import { findFuzzRoot } from "./util";
import { getGlobalContext, useGlobalContext } from "./globalContextProvider";
import path from "path";
import { get } from "http";
import { FunctionResult } from "./functionOutputProcesser";
import { generateHarness, optimizeHarness } from "./harnessGen";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  await useGlobalContext(context);
  const globalContext = getGlobalContext();
  console.log('Congratulations, your extension "sbomfuzz" is now active!');
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "sbomfuzz.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from sbomfuzz!");
    }
  );

  const provider = new SbomFuzzWebviewViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SbomFuzzWebviewViewProvider.viewType,
      provider
    )
  );

  const codeLensProvider = new RustFunctionCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "rust" },
      codeLensProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "sbomfuzz.showFunctionInfo", // same as used in CodeLens
      (functionName: string, filePath: string) => {
        // Make sure function is public
        make_function_public(filePath, functionName);
        let focusTarget = findFuzzTargets(
          functionName,
          filePath,
          globalContext.results ?? []
        );

        if (!focusTarget) {
          return;
        }

        startGeneration(
          focusTarget!,
          globalContext.fuzzRoot!,
          globalContext.extensionPath!
        );
      }
    )
  );

  context.subscriptions.push(disposable);
}

export function findFuzzTargets(
  functionName: string,
  filePath: string,
  functionTargets: FunctionResult[]
) {
  console.log("generate fuzzing target");

  // Find the function info with matching name and filePath
  const targetInfo = functionTargets.find(
    (fn) =>
      fn.functionName === functionName &&
      fn.functionLocation!.filePath === filePath
  );

  if (!targetInfo) {
    console.log(`Function ${functionName} not found in ${filePath}`);
    return;
  }

  // Do something with targetInfo...
  console.log(`Found function`);
  return targetInfo;
}

export function startGeneration(
  target: FunctionResult,
  root: string,
  extensionPath: string
) {
  console.log("Generating harness for target:", target);
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Optimizing fuzz harness...",
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0 });

      const { success, targetPath } = await generateHarness(
        target,
        root,
        extensionPath
      );
      if (!success || !targetPath) {
        vscode.window.showErrorMessage("❌ Failed to generate harness.");
        return;
      }

      progress.report({ increment: 30, message: "Harness generated." });
      vscode.window.showInformationMessage(
        "✅ Harness generated successfully!"
      );

      const optimized = await optimizeHarness(
        target,
        root,
        targetPath,
        extensionPath
      );

      if (optimized.success) {
        progress.report({
          increment: 70,
          message: "Harness optimized and ready.",
        });
        vscode.window.showInformationMessage("🚀 Harness is ready to run!");
      } else {
        progress.report({
          increment: 70,
          message: "Optimization failed.",
        });
        vscode.window.showWarningMessage("⚠️ Harness optimization failed.");
      }
    }
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
