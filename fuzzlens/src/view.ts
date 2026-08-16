import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  findCargoProjectRoot,
  findFuzzRoot,
  getFuzzTargets,
  waitForDir,
  globalBroadcastEventType,
} from "./util";
import { FunctionLocation } from "./functionOutputProcesser";
import {
  deleteSelectedHarness,
  generateHarness,
  optimizeHarness,
  runGenerateAndOptimizeHarness,
  assessHarness,
  runSelectedHarness,
  runSelectedHarnessGUI,
  stopHarness,
} from "./harnessGen";
import {
  getHarnessRecordByTargetName,
  setHarnessOptimized,
  applyHarnessMetadataToTargets,
} from "./harnessRegistry";
import { make_function_public } from "./rustFunctionCodeLensProvider";
import useGlobalContext, { getGlobalContext } from "./globalContextProvider";
let currentWebview: vscode.Webview | undefined;
export class FuzzLensWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "fuzzlensWebview";

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "media"),
      ],
    };
    currentWebview = webviewView.webview;
    const globalContext = getGlobalContext();
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    const handlers: Record<string, (message: any) => void> = {
      log: (msg) => console.log("[webview log]", msg.message),

      runFuzz: (msg) =>
        vscode.window.showInformationMessage(`Running fuzz target: ${msg.target}`),

      getGlobalContext: (_msg) => {
        webviewView.webview.postMessage({ command: "globalContext", context: globalContext });
      },

      executeCommand: (msg) =>
        vscode.commands.executeCommand(msg.commandId, ...(msg.args ?? [])),

      runAnalyzer: (msg) => {
        if (msg.projectPath) {
          globalContext.projectRoot = msg.projectPath;
        }
        vscode.commands.executeCommand("fuzzlens.runAnalysisTool", msg.projectPath);
      },

      openLocation: (msg) => jumpToFunctionLocation(msg),

      revealPath: (msg) => {
        if (msg.path) {
          vscode.commands.executeCommand("revealInExplorer", vscode.Uri.file(msg.path));
        }
      },

      runFuzzTarget: (msg) => runSelectedHarnessGUI(msg.target, globalContext.fuzzRoot!),

      assessFuzzTarget: (msg) => {
        const targetName = msg.target;
        const root = globalContext.fuzzRoot!;
        assessHarness(targetName, root).then((result) => {
          if (result.success) {
            setHarnessOptimized(targetName, true);
            const record = getHarnessRecordByTargetName(targetName);
            if (record) {
              const match = globalContext.results?.find(
                (fn) => fn.functionKey === record.functionKey
              );
              if (match) {
                match.harnessOptimized = true;
              }
              vscode.commands.executeCommand("fuzzlens.broadcast", {
                eventType: globalBroadcastEventType.UpdateFunctionStatus,
                functionKey: record.functionKey,
                harnessOptimized: true,
              });
            }
          } else {
            vscode.window.showWarningMessage("⚠️ Harness assess failed. See output for details.");
          }
        });
      },

      stopFuzzTarget: (_msg) => {
        stopHarness();
        const newTargets = applyHarnessMetadataToTargets(getFuzzTargets(globalContext.fuzzRoot!));
        webviewView.webview.postMessage({ command: "refreshHarnessList", targets: newTargets });
      },

      deleteFuzzTarget: (msg) => {
        deleteSelectedHarness(msg.target, globalContext.fuzzRoot!);
        globalContext.fuzzTargets = applyHarnessMetadataToTargets(
          getFuzzTargets(globalContext.fuzzRoot!)
        );
        webviewView.webview.postMessage({
          command: "refreshHarnessList",
          targets: globalContext.fuzzTargets,
        });
      },

      createFuzzRoot: (msg) => {
        const targetDir = msg.target;
        if (!targetDir) {
          vscode.window.showErrorMessage("No project path selected.");
          return;
        }
        const fuzzDir = path.join(targetDir, "fuzz");
        if (fs.existsSync(fuzzDir)) {
          vscode.window.showWarningMessage("Fuzz directory already exists.");
          return;
        }
        const terminal = vscode.window.createTerminal({ name: "cargo-fuzz-init", cwd: targetDir });
        terminal.show();
        terminal.sendText("cargo fuzz init");
        waitForDir(fuzzDir).then((ok) => {
          if (ok) {
            vscode.window.showInformationMessage("✅ Fuzz root created!");
            webviewView.webview.postMessage({ command: "fuzzRoot", path: fuzzDir });
          } else {
            vscode.window.showWarningMessage("⚠️ Fuzz root may failed, please check.");
          }
        });
      },

      getFuzzTargets: (msg) => {
        const targets = applyHarnessMetadataToTargets(getFuzzTargets(msg.fuzzRoot));
        globalContext.fuzzTargets = targets;
        webviewView.webview.postMessage({ command: "fuzzTargetsListed", targets });
      },

      generateHarness: (msg) => {
        const { target, fuzzRoot } = msg;
        const extensionPath = this.context.extensionPath;
        if (target?.functionLocation?.filePath && target?.functionName) {
          make_function_public(target.functionLocation.filePath, target.functionName);
        }
        runGenerateAndOptimizeHarness(target, fuzzRoot, extensionPath);
      },
    };

    webviewView.webview.onDidReceiveMessage((message) => {
      console.log("[webview] Received message:", message);
      const handler = handlers[message.command];
      if (handler) {
        handler(message);
      } else {
        console.warn("[webview] Unhandled command:", message.command);
      }
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const webviewUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media")
    );

    const templatePath = path.join(
      this.context.extensionPath,
      "public",
      "template.html"
    );
    let html = fs.readFileSync(templatePath, "utf-8");

    html = html
      .replace(/\$\{webviewUri\}/g, webviewUri.toString())
      .replace(/\$\{cspSource\}/g, webview.cspSource);

    return html;
  }

  // Expose the current webview to other modules
  static getWebview(): vscode.Webview | undefined {
    return currentWebview;
  }
}

function jumpToFunctionLocation(loc: FunctionLocation) {
  const uri = vscode.Uri.file(loc.filePath);

  vscode.workspace.openTextDocument(uri).then((doc) => {
    // Use the offset to get the position in the document
    if (loc.offset === undefined) {
      vscode.window.showTextDocument(doc).then((editor) => {
        const pos = new vscode.Position(0, 0);
        const selection = new vscode.Selection(pos, pos);
        editor.selection = selection;
        editor.revealRange(
          new vscode.Range(pos, pos),
          vscode.TextEditorRevealType.InCenter
        );
      });
      return;
    }

    const position = doc.positionAt(loc.offset);
    let line = position.line;

    // Jump past doc comments
    while (line < doc.lineCount) {
      const text = doc.lineAt(line).text;
      // Check if the line is a doc comment
      if (/^\s*\/\/\//.test(text)) {
        line++;
      } else {
        break;
      }
    }

    vscode.window.showTextDocument(doc).then((editor) => {
      // REPLACED COLUMN WITH 0 SINCE I'VE JUMPED PAST DOC COMMENTS AND THERES NO GUARANTEE COLUMN EXISTS
      const pos = new vscode.Position(line, 0);
      const selection = new vscode.Selection(pos, pos);
      editor.selection = selection;
      editor.revealRange(
        new vscode.Range(pos, pos),
        vscode.TextEditorRevealType.InCenter
      );
    });
  });
}
