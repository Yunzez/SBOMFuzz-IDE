import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { runRustAnalyzer } from "./rustAnalyzerStart";
import { findCargoProjectRoot } from "./util";
import { FunctionLocation, loadFunctionResults } from "./functionOutputProcesser";
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

      if (message.command === "showSbom") {
        vscode.window.showInformationMessage(
          `Showing SBOM for target: ${message.target}`
        );
      }

      if (message.command === "requestEntries") {
        vscode.window.showInformationMessage(
          `Running sbomfuzz for entry list ${message.target}, this may take a while`
        );
      }

      if (message.command === "runAnalyzer") {
        const projectRoot = message.projectPath; // send this from the webview
        console.log("Resolved analyzer path:", projectRoot);
        console.log("Exists:", fs.existsSync(projectRoot));
        console.log("Is file:", fs.statSync(projectRoot).isFile());
        runRustAnalyzer(this.context, projectRoot, webviewView.webview);
      }

      if (message.command === "getCargoProjectRoot") {
        console.log("Requesting Cargo project root");
        const root = findCargoProjectRoot(); // your helper function
        webviewView.webview.postMessage({
          command: "cargoProjectRoot",
          path: root,
        });
      }

      if (message.command === "openLocation") {
        jumpToFunctionLocation(message);
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
}



function jumpToFunctionLocation(loc: FunctionLocation) {
  const uri = vscode.Uri.file(loc.filePath);

  vscode.workspace.openTextDocument(uri).then((doc) => {
    // Use the offset to get the position in the document
    const position = doc.positionAt(loc.offset);
    let line = position.line;
    const column = position.character;

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
