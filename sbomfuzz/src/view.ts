import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
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
      if (message.command === "runFuzz") {
        vscode.window.showInformationMessage(
          `Running fuzz target: ${message.target}`
        );
        // TODO: hook into your actual harness generator/runner
      } else if (message.command === "showSbom") {
        vscode.window.showInformationMessage(
          `Showing SBOM for target: ${message.target}`
        );
      } else if (message.command === "requestEntries") {
        vscode.window.showInformationMessage(
          `Running sbomfuzz for entry list ${message.target}, this may take a while`
        );
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
      "media",
      "template.html"
    );
    let html = fs.readFileSync(templatePath, "utf-8");

    html = html.replace(/\$\{webviewUri\}/g, webviewUri.toString());

    return html;
  }
}
