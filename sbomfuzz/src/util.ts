import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function findCargoProjectRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) return;

  for (const folder of folders) {
    const folderPath = folder.uri.fsPath;
    const cargoPath = path.join(folderPath, 'Cargo.toml');
    if (fs.existsSync(cargoPath)) {
      return folderPath;
    }
  }

  return;
}
