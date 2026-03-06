// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { SbomFuzzWebviewViewProvider } from "./view";
import {
  make_function_public,
  RustFunctionCodeLensProvider,
} from "./rustFunctionCodeLensProvider";
import { findFuzzRoot, getFuzzTargets, globalBroadcastEventType } from "./util";
import { getGlobalContext, useGlobalContext } from "./globalContextProvider";
import { FunctionResult } from "./functionOutputProcesser";
import { generateHarness, optimizeHarness, runGenerateAndOptimizeHarness } from "./harnessGen";
import { runRustAnalyzer } from "./rustAnalyzerStart";
import {
  applyHarnessMetadata,
  applyHarnessMetadataToTargets,
  initHarnessRegistry,
} from "./harnessRegistry";
import { isFileExcluded, loadExcludedFilePaths } from "./excludeList";
const out = vscode.window.createOutputChannel("SBOMFuzz_debug");
export function channel_log(m: any) {
  out.appendLine(typeof m === "string" ? m : JSON.stringify(m));
}
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("starting harness registry");
  await initHarnessRegistry(context);
  console.log("starting global context");
  await useGlobalContext(context);
  const globalContext = getGlobalContext();
  console.log('Congratulations, your extension "sbomfuzz" is now active!');
  channel_log("Fuzzing helper is active!");

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

  if (globalContext.projectRoot) {
    await runAnalysisTask(context);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("sbomfuzz.refreshHarnessList", () => {
      const webview = SbomFuzzWebviewViewProvider.getWebview();
      const fuzzRoot = globalContext.fuzzRoot;
      if (!fuzzRoot) {
        vscode.window.showWarningMessage(
          "SBOMFuzz could not find a fuzz directory."
        );
        return;
      }
      const targets = applyHarnessMetadataToTargets(getFuzzTargets(fuzzRoot));
      if (webview) {
        webview.postMessage({ command: "refreshHarnessList", targets });
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "sbomfuzz.showFunctionInfo", // same as used in CodeLens
      (functionName: string, filePath: string) => {
        const excludedPaths = loadExcludedFilePaths(globalContext.projectRoot);
        if (isFileExcluded(filePath, excludedPaths)) {
          vscode.window.showWarningMessage(
            "This file is excluded from SBOMFuzz actions."
          );
          return;
        }
        // Make sure function is public
        make_function_public(filePath, functionName);
        let focusTarget = findFuzzTargets(
          functionName,
          filePath,
          globalContext.results ?? []
        );
        if (!focusTarget) {
          vscode.window
            .showErrorMessage(
              `Oops! Function ${functionName} not found in analysis. If this is a new function you wrote, please rerun the analysis tool.`,
              "Rerun Analysis"
            )
            .then((selection) => {
              if (selection === "Rerun Analysis") {
                vscode.commands.executeCommand("sbomfuzz.runAnalysisTool");
              }
            });
          return;
        }

        if (!globalContext.fuzzRoot) {
          vscode.window.showErrorMessage(
            "SBOMFuzz could not find a fuzz root. Please create one before generating a harness."
          );
          return;
        }

        focusTarget.pendingGeneration = true;
        vscode.commands.executeCommand("sbomfuzz.broadcast", {
          eventType: globalBroadcastEventType.UpdateFunctionStatus,
          functionKey: focusTarget.functionKey,
          pendingGeneration: true,
        });

       runGenerateAndOptimizeHarness(
         focusTarget!,
         globalContext.fuzzRoot!,
         globalContext.extensionPath!
       );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "sbomfuzz.openHarness",
      (harnessPath: string) => {
        const uri = vscode.Uri.file(harnessPath);
        vscode.workspace.openTextDocument(uri).then((doc) => {
          vscode.window.showTextDocument(doc, { preview: false });
        });
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sbomfuzz.broadcast", (args) => {
      const webview = SbomFuzzWebviewViewProvider.getWebview();
      if (webview) {
        webview.postMessage({ command: "globalBroadcast", ...args });
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "sbomfuzz.runAnalysisTool",
      async (projectRoot?: string) => {
        const options = projectRoot ? { projectRoot } : undefined;
        await runAnalysisTask(context, options);
      }
    )
  );


}

async function runAnalysisTask(
  context: vscode.ExtensionContext,
  options: { projectRoot?: string } = {}
) {
  const globalContext = getGlobalContext();
  const projectRoot = options.projectRoot ?? globalContext.projectRoot;

  if (!projectRoot) {
    vscode.window.showErrorMessage(
      "SBOMFuzz could not determine a Cargo project to analyze."
    );
    return;
  }

  if (options.projectRoot) {
    globalContext.projectRoot = options.projectRoot;
  }

  if (!globalContext.fuzzRoot) {
    const detectedFuzzRoot = findFuzzRoot();
    if (detectedFuzzRoot) {
      globalContext.fuzzRoot = detectedFuzzRoot;
    }
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: "SBOMFuzz: Analyzing project…",
      cancellable: false,
    },
    async () => {
      const results = await runRustAnalyzer(context, projectRoot);
      applyHarnessMetadata(results);
      globalContext.results = results;

      const fuzzRoot = globalContext.fuzzRoot;
      if (fuzzRoot) {
        globalContext.fuzzTargets = applyHarnessMetadataToTargets(
          getFuzzTargets(fuzzRoot)
        );
      }

      const webview = SbomFuzzWebviewViewProvider.getWebview();
      if (webview) {
        webview.postMessage({
          command: "rustAnalysisDone",
          results,
        });

        if (globalContext.fuzzTargets) {
          webview.postMessage({
            command: "refreshHarnessList",
            targets: globalContext.fuzzTargets,
          });
        }
      }
    }
  );
}

export function findFuzzTargets(
  functionName: string,
  filePath: string,
  functionTargets: FunctionResult[]
) {
  console.log("generate fuzzing target");
  console.log(`Searching for function ${functionName} in ${filePath}`);
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
        vscode.window.showErrorMessage("Failed to generate harness.");
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
        vscode.commands.executeCommand("sbomfuzz.refreshHarnessList");
      } else {
        progress.report({
          increment: 70,
          message: "Optimization failed.",
        });
        vscode.window.showWarningMessage("⚠️ Harness optimization failed.");
        vscode.commands.executeCommand("sbomfuzz.refreshHarnessList");
      }
    }
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
