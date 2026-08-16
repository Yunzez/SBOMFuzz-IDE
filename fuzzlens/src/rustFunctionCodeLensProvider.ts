import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getGlobalContext } from "./globalContextProvider";
import { FunctionStatus } from "./functionOutputProcesser";
import { isFileExcluded, loadExcludedFilePaths } from "./excludeList";
import { getRunningTargetName } from "./harnessGen";
import { getHarnessRecordByTargetName } from "./harnessRegistry";

const _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

export function refreshCodeLenses(): void {
  _onDidChangeCodeLenses.fire();
}

export class RustFunctionCodeLensProvider implements vscode.CodeLensProvider {
  readonly onDidChangeCodeLenses = _onDidChangeCodeLenses.event;

  provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const lenses: vscode.CodeLens[] = [];
    const globalContext = getGlobalContext();
    const excludedPaths = loadExcludedFilePaths(globalContext.projectRoot);
    if (isFileExcluded(document.uri.fsPath, excludedPaths)) {
      return lenses;
    }

    // Matches Rust function signatures including optional pub qualifiers (e.g. pub(crate)),
    // async, generics, and lifetimes. We run against the whole document so we can also
    // capture signatures that span multiple lines.
    const text = document.getText();
    const regex =
      /^(?:(?:\s*#.*\n)|(?:\s*\/\/\/.*\n))*\s*(?:pub\s*(?:\([^)]*\)\s*)?)?(?:const\s+)?(?:unsafe\s+)?(?:extern\s+"[^"]+"\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)\b/gm;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const functionName = match[1];

      const matchText = match[0];
      const fnKeywordOffset = matchText.indexOf("fn");
      if (fnKeywordOffset === -1) {
        continue;
      }
      const absoluteFnOffset = match.index + fnKeywordOffset;
      const fnPosition = document.positionAt(absoluteFnOffset);
      const line = fnPosition.line;
      const lineText = document.lineAt(line).text;
      const range = new vscode.Range(line, 0, line, lineText.length);
      const matchResult = (globalContext.results ?? []).find(
        (fn) =>
          fn.functionName === functionName &&
          fn.functionLocation?.filePath === document.uri.fsPath
      );
      const hasHarness =
        matchResult?.status === FunctionStatus.HarnessGenerated &&
        !!matchResult?.harnessPath &&
        fs.existsSync(matchResult.harnessPath);

      if (hasHarness) {
        // Lens 1: jump to the harness file
        lenses.push(new vscode.CodeLens(range, {
          title: "Jump to Harness",
          command: "fuzzlens.openHarness",
          arguments: [matchResult!.harnessPath],
        }));

        // Lens 2: run or stop depending on whether this target is currently running
        const targetName = matchResult!.harnessTargetName!;
        const isRunning = getRunningTargetName() === targetName;
        lenses.push(new vscode.CodeLens(range, {
          title: isRunning ? "⬛ Stop Fuzzing" : "▶ Run Harness",
          command: isRunning ? "fuzzlens.stopHarnessFromCodeLens" : "fuzzlens.runHarnessFromCodeLens",
          arguments: isRunning ? [] : [targetName],
        }));
      } else {
        lenses.push(new vscode.CodeLens(range, {
          title: "Generate Harness!",
          command: "fuzzlens.showFunctionInfo",
          arguments: [functionName, document.uri.fsPath],
        }));
      }
    }

    // ── Harness-file lenses ───────────────────────────────────────────────────
    // When the open file is a generated harness, show what function it covers
    // and a run/stop button, anchored to line 0.
    const basename = path.basename(document.uri.fsPath, ".rs");
    if (basename.startsWith("fuzz_target_")) {
      const record = getHarnessRecordByTargetName(basename);
      if (record) {
        const firstLine = document.lineAt(0);
        const topRange = new vscode.Range(0, 0, 0, firstLine.text.length);

        // Look up the full module path from analysis results for a richer label
        const fnResult = (globalContext.results ?? []).find(
          (r) => r.functionKey === record.functionKey
        );
        const label = fnResult
          ? `${fnResult.functionModulePath}::${fnResult.functionName}`
          : record.functionName;

        lenses.push(new vscode.CodeLens(topRange, {
          title: `← ${label}`,
          command: "fuzzlens.jumpToFunctionFromHarness",
          arguments: [record.functionKey],
        }));

        const isRunning = getRunningTargetName() === basename;
        lenses.push(new vscode.CodeLens(topRange, {
          title: isRunning ? "⬛ Stop Fuzzing" : "▶ Run Harness",
          command: isRunning ? "fuzzlens.stopHarnessFromCodeLens" : "fuzzlens.runHarnessFromCodeLens",
          arguments: isRunning ? [] : [basename],
        }));
      }
    }

    return lenses;
  }
}

/// Given a file path and function name, make that function public /
/// Does nothing if the function is already public
export function make_function_public(file_path: string, function_name: string) {
  let file_content = fs.readFileSync(file_path, 'utf-8');
  const lines = file_content.split('\n');

  // Regex to match function with function_name that isn't already public
  const fn_regex = new RegExp(`^\\s*(?!pub\\s)(async\\s+)?fn\\s+${function_name}\\s*\\(`);

  // Search for function in each line
  for (let i = 0; i < lines.length; i++) {
    if (fn_regex.test(lines[i])) {
      // Skip whitespace
      const indent_match = lines[i].match(/^(\s*)/);
      const indent = indent_match ? indent_match[1] : '';
      // Insert pub on front of the function signature
      // Fairly certain "pub" always needs to go on the front of the signature in rust syntax
      lines[i] = lines[i].replace(fn_regex, `${indent}pub $1fn ${function_name}(`);
      fs.writeFileSync(file_path, lines.join('\n'), 'utf-8');
      return;
    }
  }
}
