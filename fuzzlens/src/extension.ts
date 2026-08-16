// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { FuzzLensWebviewViewProvider } from "./view";
import {
  make_function_public,
  RustFunctionCodeLensProvider,
} from "./rustFunctionCodeLensProvider";
import { findFuzzRoot, getFuzzTargets, globalBroadcastEventType } from "./util";
import { getGlobalContext, useGlobalContext } from "./globalContextProvider";
import { FunctionResult } from "./functionOutputProcesser";
import { runGenerateAndOptimizeHarness, runSelectedHarnessGUI, stopHarness } from "./harnessGen";
import { runRustAnalyzer } from "./rustAnalyzerStart";
import {
  applyHarnessMetadata,
  applyHarnessMetadataToTargets,
  initHarnessRegistry,
} from "./harnessRegistry";
import { isFileExcluded, loadExcludedFilePaths } from "./excludeList";
const out = vscode.window.createOutputChannel("FuzzLens_debug");
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
  console.log('Congratulations, your extension "fuzzlens" is now active!');
  channel_log("Fuzzing helper is active!");

  const provider = new FuzzLensWebviewViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FuzzLensWebviewViewProvider.viewType,
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
    vscode.commands.registerCommand("fuzzlens.refreshHarnessList", () => {
      const webview = FuzzLensWebviewViewProvider.getWebview();
      const fuzzRoot = globalContext.fuzzRoot;
      if (!fuzzRoot) {
        vscode.window.showWarningMessage(
          "FuzzLens could not find a fuzz directory."
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
      "fuzzlens.showFunctionInfo", // same as used in CodeLens
      (functionName: string, filePath: string) => {
        const excludedPaths = loadExcludedFilePaths(globalContext.projectRoot);
        if (isFileExcluded(filePath, excludedPaths)) {
          vscode.window.showWarningMessage(
            "This file is excluded from FuzzLens actions."
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
                vscode.commands.executeCommand("fuzzlens.runAnalysisTool");
              }
            });
          return;
        }

        if (!globalContext.fuzzRoot) {
          vscode.window.showErrorMessage(
            "FuzzLens could not find a fuzz root. Please create one before generating a harness."
          );
          return;
        }

        focusTarget.pendingGeneration = true;
        vscode.commands.executeCommand("fuzzlens.broadcast", {
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
      "fuzzlens.openHarness",
      (harnessPath: string) => {
        const uri = vscode.Uri.file(harnessPath);
        vscode.workspace.openTextDocument(uri).then((doc) => {
          vscode.window.showTextDocument(doc, { preview: false });
        });
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("fuzzlens.broadcast", (args) => {
      const webview = FuzzLensWebviewViewProvider.getWebview();
      if (webview) {
        webview.postMessage({ command: "globalBroadcast", ...args });
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "fuzzlens.runAnalysisTool",
      async (projectRoot?: string) => {
        const options = projectRoot ? { projectRoot } : undefined;
        await runAnalysisTask(context, options);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "fuzzlens.runHarnessFromCodeLens",
      (targetName: string) => {
        if (!globalContext.fuzzRoot) {
          vscode.window.showErrorMessage(
            "FuzzLens could not find a fuzz root."
          );
          return;
        }
        runSelectedHarnessGUI(targetName, globalContext.fuzzRoot);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "fuzzlens.stopHarnessFromCodeLens",
      () => stopHarness()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "fuzzlens.jumpToFunctionFromHarness",
      (functionKey: string) => {
        const fn = (globalContext.results ?? []).find(
          (r) => r.functionKey === functionKey
        );
        if (!fn?.functionLocation) {
          vscode.window.showWarningMessage("Could not locate the source function.");
          return;
        }
        const uri = vscode.Uri.file(fn.functionLocation.filePath);
        vscode.workspace.openTextDocument(uri).then((doc) => {
          const position = doc.positionAt(fn.functionLocation!.offset);
          vscode.window.showTextDocument(doc, { preview: false }).then((editor) => {
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(
              new vscode.Range(position, position),
              vscode.TextEditorRevealType.InCenter
            );
          });
        });
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
      "FuzzLens could not determine a Cargo project to analyze."
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
      title: "FuzzLens: Analyzing project…",
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

      const webview = FuzzLensWebviewViewProvider.getWebview();
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

// This method is called when your extension is deactivated
export function deactivate() {}
