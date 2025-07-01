/**
 * @fileoverview
 * Provides a global context provider for the SBOMFuzz-IDE VSCode extension.
 *
 * This module manages shared state across the extension, including the fuzz root,
 * project root, and analysis results. It exposes functions to initialize and access
 * this global context, and integrates with project analysis utilities.
 *
 * @module globalContextProvider
 */
import path from "path";
import fs from "fs";
import * as vscode from "vscode";
import { loadFunctionResults } from "./functionOutputProcesser";
import { findCargoProjectRoot, findFuzzRoot } from "./util";
import { runRustAnalyzer } from "./rustAnalyzerStart";

export interface SharedContext {
  fuzzRoot?: string;
  projectRoot?: string;
  extensionPath?: string;
  results?: any[];
}

const globalContext: SharedContext = {
  fuzzRoot: undefined,
  projectRoot: undefined,
  results: [],
};

export async function useGlobalContext(context: vscode.ExtensionContext) {
  // You can run analysis, detect fuzz root, etc.

  const projectPath = context.extensionPath;
  const fuzzRoot = findFuzzRoot();
  const root = findCargoProjectRoot();
  const outputPath = path.join(projectPath, "output");
  if (!fs.existsSync(outputPath) && root) {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Analyzing current project...", // 🌀 this is the text next to spinner
        cancellable: false,
      },
      async () => {
        await runRustAnalyzer(context, root);
      }
    );
  }
  const results = loadFunctionResults(path.join(projectPath, "output"));
  globalContext.fuzzRoot = fuzzRoot;
  globalContext.projectRoot = root;
  globalContext.results = results;
  globalContext.extensionPath = projectPath;
  return getGlobalContext();
}

export function getGlobalContext(): SharedContext {
  return globalContext;
}

export default useGlobalContext;
