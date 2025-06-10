import * as vscode from 'vscode';

export class SbomFuzzTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.ProviderResult<vscode.TreeItem[]> {
    return [
      new vscode.TreeItem("Hello"),
      new vscode.TreeItem("World")
    ];
  }
}
