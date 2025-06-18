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
var vscode6 = __toESM(require("vscode"));

// src/view.ts
var vscode4 = __toESM(require("vscode"));
var fs4 = __toESM(require("fs"));
var path4 = __toESM(require("path"));

// src/rustAnalyzerStart.ts
var vscode2 = __toESM(require("vscode"));
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var cp = __toESM(require("child_process"));

// src/functionOutputProcesser.ts
var fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var vscode = __toESM(require("vscode"));
function findAllFunctionsFile(outputPath) {
  if (!fs.existsSync(outputPath) || !fs.statSync(outputPath).isDirectory()) {
    console.error(`Output path is not a directory: ${outputPath}`);
    return void 0;
  }
  const files = fs.readdirSync(outputPath);
  const match = files.find((file) => file.includes("_all_functions.txt"));
  if (!match) {
    console.error("No *_all_functions.txt file found.");
    return void 0;
  }
  return import_path.default.join(outputPath, match);
}
function loadFunctionResults(outputPath) {
  if (!outputPath) {
    return void 0;
  }
  const resultFilePath = findAllFunctionsFile(outputPath);
  if (!resultFilePath) {
    return void 0;
  }
  vscode.window.showInformationMessage(
    `Rust analyzer resuted processed, checking output path: ${resultFilePath}`
  );
  if (!fs.existsSync(resultFilePath)) {
    console.error(`Output file not found: ${resultFilePath}`);
    return void 0;
  }
  const data = fs.readFileSync(resultFilePath, "utf8");
  const lines = data.split("\n");
  const result = {};
  let currentKey = "";
  for (const line of lines) {
    if (line.startsWith("Function Key:")) {
      currentKey = line.replace("Function Key:", "").trim();
      result[currentKey] = {};
    } else if (line.startsWith("-") && currentKey) {
      const fieldLine = line.slice(1).trim();
      const sepIdx = fieldLine.indexOf(":");
      if (sepIdx !== -1) {
        const field = fieldLine.slice(0, sepIdx).trim();
        const value = fieldLine.slice(sepIdx + 1).trim();
        result[currentKey][field] = value;
      }
    }
  }
  const keys = Object.keys(result);
  if (keys.length > 0) {
    return keys.map((key) => {
      const r = result[key];
      return {
        functionKey: key,
        functionName: r["Function Name"] || "",
        functionCrate: r["Crate"] || "",
        functionModulePath: r["Module Path"] || "",
        functionDescription: r["Function Description"] || "",
        functionParameters: r["Parameters"],
        functionLocation: parseFunctionLocation(r["Location"])
      };
    });
  }
  vscode.window.showInformationMessage(
    `Rust analyzer resuted processed, ${result.length} functions found`
  );
  return void 0;
}
function parseFunctionLocation(locationStr) {
  if (!locationStr || !locationStr.includes("|offset=")) {
    return void 0;
  }
  const [filePath, offsetStr] = locationStr.split("|offset=");
  const offset = parseInt(offsetStr, 10);
  if (isNaN(offset)) {
    return void 0;
  }
  return {
    filePath,
    offset
  };
}

// src/rustAnalyzerStart.ts
function runRustAnalyzer(context, projectPath, webview) {
  vscode2.window.showInformationMessage(
    "Starting Rust analyzer, this may take a while."
  );
  const binaryPath = path2.join(context.extensionPath, "core", "rust-analyzer");
  const outputPath = path2.join(context.extensionPath, "output");
  if (fs2.existsSync(outputPath)) {
    fs2.rmSync(outputPath, { recursive: true, force: true });
  }
  fs2.mkdirSync(outputPath, { recursive: true });
  const args = ["function-analysis", projectPath, outputPath];
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
      vscode2.window.showInformationMessage(
        "Rust analyzer finished successfully, processing results..."
      );
      console.log("[ext] Sending rustAnalysisDone to webview", outputPath);
      console.log(stdout);
      const results = loadFunctionResults(outputPath) ?? [];
      console.log("Loaded function results:", results);
      webview.postMessage({
        command: "rustAnalysisDone",
        results
      });
    } else {
      vscode2.window.showErrorMessage(`Rust analyzer failed: ${stderr}`);
    }
  });
}

// src/util.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var vscode3 = __toESM(require("vscode"));
function findCargoProjectRoot() {
  const folders = vscode3.workspace.workspaceFolders;
  if (!folders) return;
  for (const folder of folders) {
    const folderPath = folder.uri.fsPath;
    const cargoPath = path3.join(folderPath, "Cargo.toml");
    if (fs3.existsSync(cargoPath)) {
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
      if (message.command === "log") {
        console.log("[webview log]", message.message);
      }
      console.log("[webview] Received message:", message);
      if (message.command === "runFuzz") {
        vscode4.window.showInformationMessage(
          `Running fuzz target: ${message.target}`
        );
      }
      if (message.command === "showSbom") {
        vscode4.window.showInformationMessage(
          `Showing SBOM for target: ${message.target}`
        );
      }
      if (message.command === "requestEntries") {
        vscode4.window.showInformationMessage(
          `Running sbomfuzz for entry list ${message.target}, this may take a while`
        );
      }
      if (message.command === "runAnalyzer") {
        const projectRoot = message.projectPath;
        console.log("Resolved analyzer path:", projectRoot);
        console.log("Exists:", fs4.existsSync(projectRoot));
        console.log("Is file:", fs4.statSync(projectRoot).isFile());
        runRustAnalyzer(this.context, projectRoot, webviewView.webview);
      }
      if (message.command === "getCargoProjectRoot") {
        console.log("Requesting Cargo project root");
        const root = findCargoProjectRoot();
        webviewView.webview.postMessage({
          command: "cargoProjectRoot",
          path: root
        });
      }
      if (message.command === "openLocation") {
        const { filePath, offset } = message;
        const uri = vscode4.Uri.file(filePath);
        vscode4.workspace.openTextDocument(uri).then((doc) => {
          const position = doc.positionAt(offset);
          const line = position.line;
          const column = position.character;
          vscode4.window.showTextDocument(doc).then((editor) => {
            const pos = new vscode4.Position(line, column);
            const selection = new vscode4.Selection(pos, pos);
            editor.selection = selection;
            editor.revealRange(
              new vscode4.Range(pos, pos),
              vscode4.TextEditorRevealType.InCenter
            );
          });
        });
      }
    });
  }
  getHtmlForWebview(webview) {
    const mediaPath = vscode4.Uri.file(
      path4.join(this.context.extensionPath, "media")
    );
    const webviewUri = webview.asWebviewUri(mediaPath);
    const templatePath = path4.join(
      this.context.extensionPath,
      "media",
      "template.html"
    );
    let html = fs4.readFileSync(templatePath, "utf-8");
    html = html.replace(/\$\{webviewUri\}/g, webviewUri.toString());
    return html;
  }
};

// src/rustFunctionCodeLensProvider.ts
var vscode5 = __toESM(require("vscode"));
var RustFunctionCodeLensProvider = class {
  provideCodeLenses(document) {
    const lenses = [];
    const regex = /^\s*(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(/;
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const match = regex.exec(line.text);
      if (match) {
        const functionName = match[3];
        const range = new vscode5.Range(i, 0, i, line.text.length);
        const cmd = {
          title: "Show Function Info",
          command: "workbench.view.extension.sbomfuzzContainer",
          arguments: [functionName]
        };
        lenses.push(new vscode5.CodeLens(range, cmd));
      }
    }
    return lenses;
  }
};

// src/extension.ts
function activate(context) {
  console.log('Congratulations, your extension "sbomfuzz" is now active!');
  const disposable = vscode6.commands.registerCommand(
    "sbomfuzz.helloWorld",
    () => {
      vscode6.window.showInformationMessage("Hello World from sbomfuzz!");
    }
  );
  const provider = new SbomFuzzWebviewViewProvider(context);
  context.subscriptions.push(
    vscode6.window.registerWebviewViewProvider(
      SbomFuzzWebviewViewProvider.viewType,
      provider
    )
  );
  const codeLensProvider = new RustFunctionCodeLensProvider();
  context.subscriptions.push(
    vscode6.languages.registerCodeLensProvider({ language: "rust" }, codeLensProvider)
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
