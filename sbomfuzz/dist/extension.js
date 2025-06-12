"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));

// src/view.ts
var vscode = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var SbomFuzzWebviewViewProvider = class {
  constructor(context) {
    this.context = context;
  }
  static viewType = "sbomfuzzWebview";
  resolveWebviewView(webviewView, context, _token) {
    webviewView.webview.options = {
      enableScripts: true
    };
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === "runFuzz") {
        vscode.window.showInformationMessage(
          `Running fuzz target: ${message.target}`
        );
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
  getHtmlForWebview(webview) {
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
};

// src/extension.ts
function activate(context) {
  console.log('Congratulations, your extension "sbomfuzz" is now active!');
  const disposable = vscode2.commands.registerCommand(
    "sbomfuzz.helloWorld",
    () => {
      vscode2.window.showInformationMessage("Hello World from sbomfuzz!");
    }
  );
  const provider = new SbomFuzzWebviewViewProvider(context);
  context.subscriptions.push(
    vscode2.window.registerWebviewViewProvider(
      SbomFuzzWebviewViewProvider.viewType,
      provider
    )
  );
  context.subscriptions.push(disposable);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
