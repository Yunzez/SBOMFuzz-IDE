import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { runRustAnalyzer } from "./rustAnalyzerStart";
import {
  findCargoProjectRoot,
  findFuzzRoot,
  getFuzzTargets,
  waitForDir,
} from "./util";
import {
  FunctionLocation,
  loadFunctionResults,
} from "./functionOutputProcesser";
import {
  deleteSelectedHarness,
  generateHarness,
  optimizeHarness,
  runGenerateAndOptimizeHarness,
  runSelectedHarness,
} from "./harnessGen";
import { getGlobalContext } from "./globalContextProvider";
let currentWebview: vscode.Webview | undefined;
export class SbomFuzzWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "sbomfuzzWebview";

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
    };
    currentWebview = webviewView.webview;
    const globalContext = getGlobalContext();
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === "log") {
        console.log("[webview log]", message.message);
      }

      console.log("[webview] Received message:", message);
      if (message.command === "runFuzz") {
        vscode.window.showInformationMessage(
          `Running fuzz target: ${message.target}`
        );
      }

      if (message.command === "getGlobaclContext") {
        console.log("Requesting global context", globalContext);
        webviewView.webview.postMessage({
          command: "globalContext",
          context: globalContext,
        });
      }

      if (message.command === "runAnalyzer") {
        const projectRoot = message.projectPath; // send this from the webview
        console.log("Resolved analyzer path:", projectRoot);
        console.log("Exists:", fs.existsSync(projectRoot));
        console.log("Is file:", fs.statSync(projectRoot).isFile());
        const results = runRustAnalyzer(this.context, projectRoot);
        webviewView.webview.postMessage({
          command: "rustAnalysisDone",
          results,
        });
      }

      if (message.command === "openLocation") {
        jumpToFunctionLocation(message);
      }

      if (message.command === "runFuzzTarget") {
        runSelectedHarness(message.target, globalContext.fuzzRoot!);
      }

      if (message.command === "deleteFuzzTarget") {
        deleteSelectedHarness(message.target, globalContext.fuzzRoot!);
        const newTargets = getFuzzTargets(globalContext.fuzzRoot!);
        webviewView.webview.postMessage({
          command: "refreshHarnessList",
          targets: newTargets,
        });
      }

      if (message.command === "createFuzzRoot") {
        const targetDir = message.target; // <-- assume pathSelected is the user's cargo project

        if (!targetDir) {
          vscode.window.showErrorMessage("No project path selected.");
          return;
        }

        const fuzzDir = path.join(targetDir, "fuzz");

        if (fs.existsSync(fuzzDir)) {
          vscode.window.showWarningMessage("Fuzz directory already exists.");
          return;
        }

        const terminal = vscode.window.createTerminal({
          name: "cargo-fuzz-init",
          cwd: targetDir,
        });

        terminal.show();
        terminal.sendText("cargo fuzz init");

        waitForDir(fuzzDir).then((ok) => {
          if (ok) {
            vscode.window.showInformationMessage("✅ Fuzz root created!");
            webviewView.webview.postMessage({
              command: "fuzzRoot",
              path: fuzzDir,
            });
          } else {
            vscode.window.showWarningMessage(
              "⚠️ Fuzz root may failed, please check."
            );
          }
        });
      }

      if (message.command === "testVisualization") {
        const outputPath = "/Users/yunzezhao/Code/SBOMFuzz-IDE/sbomfuzz/output";
        console.log("Loading function results from:", outputPath);
        const results = loadFunctionResults(outputPath) ?? [];
        console.log("Loaded function results:", results);

        webviewView.webview.postMessage({
          command: "rustAnalysisDone",
          results,
        });
      }

      if (message.command === "getFuzzTargets") {
        const targets = getFuzzTargets(message.fuzzRoot);
        webviewView.webview.postMessage({
          command: "fuzzTargetsListed",
          targets,
        });
      }

      if (message.command === "generateHarness") {
        const target = message.target;
        const fuzzRoot = message.fuzzRoot;
        const extensionPath = this.context.extensionPath;
        console.log("Generating harness for target:", target);
        runGenerateAndOptimizeHarness(target, fuzzRoot, extensionPath);
      }
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const mediaPath = vscode.Uri.file(
      path.join(this.context.extensionPath, "media")
    );
    const webviewUri = webview.asWebviewUri(mediaPath);

    const templatePath = path.join(
      this.context.extensionPath,
      "public",
      "template.html"
    );
    let html = fs.readFileSync(templatePath, "utf-8");

    html = html.replace(/\$\{webviewUri\}/g, webviewUri.toString());

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
