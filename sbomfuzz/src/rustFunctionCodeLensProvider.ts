import * as vscode from "vscode";
import * as fs from "fs";
import { getGlobalContext } from "./globalContextProvider";
import { log } from "console";
import { runGenerateAndOptimizeHarness } from "./harnessGen";
import { ExtensionContext } from "vscode";

export class RustFunctionCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const lenses: vscode.CodeLens[] = [];

    // Found this online, just matches all function signatures
    // Regex to match: fn function_name(
    const regex = /^\s*(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(/;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const match = regex.exec(line.text);
      if (match) {
        const functionName = match[3]; // the captured function name
        const range = new vscode.Range(i, 0, i, line.text.length);
        const cmd: vscode.Command = {
          // title: 'Show Function Info',
          title: "Fuzz this!",
          command: "sbomfuzz.showFunctionInfo",
          arguments: [functionName, document.uri.fsPath],
        };
        lenses.push(new vscode.CodeLens(range, cmd));
      }
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