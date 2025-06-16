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
var vscode4 = __toESM(require("vscode"));

// src/view.ts
var vscode3 = __toESM(require("vscode"));
var fs2 = __toESM(require("fs"));
var path3 = __toESM(require("path"));

// src/rustAnalyzerStart.ts
var vscode = __toESM(require("vscode"));
var path = __toESM(require("path"));
var cp = __toESM(require("child_process"));
function runRustAnalyzer(context, projectPath) {
  const binaryPath = path.join(
    context.extensionPath,
    "core",
    "rust-analyzer"
  );
  const args = ["function-analysis", projectPath, "--verbose-dependency"];
  const proc = cp.spawn(binaryPath, args, {
    cwd: projectPath,
    stdio: ["ignore", "pipe", "pipe"]
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
      console.log(stdout);
    } else {
      vscode.window.showErrorMessage(`Rust analyzer failed: ${stderr}`);
    }
  });
}

// src/util.ts
var fs = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var vscode2 = __toESM(require("vscode"));
function findCargoProjectRoot() {
  const folders = vscode2.workspace.workspaceFolders;
  if (!folders) return;
  for (const folder of folders) {
    const folderPath = folder.uri.fsPath;
    const cargoPath = path2.join(folderPath, "Cargo.toml");
    if (fs.existsSync(cargoPath)) {
      return folderPath;
    }
  }
  return;
}

// src/view.ts
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
        vscode3.window.showInformationMessage(
          `Running fuzz target: ${message.target}`
        );
      } else if (message.command === "showSbom") {
        vscode3.window.showInformationMessage(
          `Showing SBOM for target: ${message.target}`
        );
      } else if (message.command === "requestEntries") {
        vscode3.window.showInformationMessage(
          `Running sbomfuzz for entry list ${message.target}, this may take a while`
        );
      } else if (message.command === "runAnalyzer") {
        const projectRoot = message.projectPath;
        console.log("Resolved analyzer path:", projectRoot);
        console.log("Exists:", fs2.existsSync(projectRoot));
        console.log("Is file:", fs2.statSync(projectRoot).isFile());
        runRustAnalyzer(this.context, projectRoot);
      } else if (message.command === "getCargoProjectRoot") {
        console.log("Requesting Cargo project root");
        const root = findCargoProjectRoot();
        webviewView.webview.postMessage({
          command: "cargoProjectRoot",
          path: root
        });
      }
    });
  }
  getHtmlForWebview(webview) {
    const mediaPath = vscode3.Uri.file(
      path3.join(this.context.extensionPath, "media")
    );
    const webviewUri = webview.asWebviewUri(mediaPath);
    const templatePath = path3.join(
      this.context.extensionPath,
      "media",
      "template.html"
    );
    let html = fs2.readFileSync(templatePath, "utf-8");
    html = html.replace(/\$\{webviewUri\}/g, webviewUri.toString());
    return html;
  }
};

// src/extension.ts
function activate(context) {
  console.log('Congratulations, your extension "sbomfuzz" is now active!');
  const disposable = vscode4.commands.registerCommand(
    "sbomfuzz.helloWorld",
    () => {
      vscode4.window.showInformationMessage("Hello World from sbomfuzz!");
    }
  );
  const provider = new SbomFuzzWebviewViewProvider(context);
  context.subscriptions.push(
    vscode4.window.registerWebviewViewProvider(
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
