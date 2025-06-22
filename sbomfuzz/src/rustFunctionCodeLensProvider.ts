import * as vscode from "vscode";

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
