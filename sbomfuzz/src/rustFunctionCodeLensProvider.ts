import * as vscode from "vscode";
import * as fs from "fs";
import { getGlobalContext } from "./globalContextProvider";
import { log } from "console";
import { runGenerateAndOptimizeHarness } from "./harnessGen";
import { ExtensionContext } from "vscode";
import { FunctionStatus } from "./functionOutputProcesser";
import { isFileExcluded, loadExcludedFilePaths } from "./excludeList";

export class RustFunctionCodeLensProvider implements vscode.CodeLensProvider {
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
      const cmd: vscode.Command = {
        title: hasHarness ? "Jump to Harness" : "Generate Harness!",
        command: hasHarness ? "sbomfuzz.openHarness" : "sbomfuzz.showFunctionInfo",
        arguments: hasHarness
          ? [matchResult!.harnessPath]
          : [functionName, document.uri.fsPath],
      };
      lenses.push(new vscode.CodeLens(range, cmd));
    }

    return lenses;
  }
}


export function onCodeLensClicked(
  functionName: string,
  filePath: string,
  extensionPath: string,
) {
  // Make sure function is public
  make_function_public(filePath, functionName);

  let globalContext = getGlobalContext();
  let fuzzTargets = globalContext.results ?? [];

  // Find the function's info in the analyzer results
  const targetInfo = fuzzTargets.find(
    (fn) => fn.functionName === functionName && fn.functionLocation.filePath === filePath
  );
  if (!targetInfo) {
    log(`Function ${functionName} not found in ${filePath}`);
    return;
  }

  // Generate the fuzzing harness for the function
  runGenerateAndOptimizeHarness(targetInfo, globalContext.fuzzRoot ?? "", extensionPath);
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
