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
import * as vscode from "vscode";
import { loadFunctionResults } from "./functionOutputProcesser";
import { findCargoProjectRoot, findFuzzRoot } from "./util";
import { runRustAnalyzer } from "./rustAnalyzerStart";


export interface SharedContext {
  fuzzRoot?: string;
  projectRoot?: string;
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
  const results = loadFunctionResults(path.join(projectPath, "output"));
  if (!results && root) {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Analyzing current project...", // 🌀 this is the text next to spinner
        cancellable: false,
      },
      async () => {
        // ⏳ Your long-running async task
        await runRustAnalyzer(context, root);
      }
    );
  }
  globalContext.fuzzRoot = fuzzRoot;
  globalContext.projectRoot = root;
  globalContext.results = results;
  return getGlobalContext();
}

export function getGlobalContext(): SharedContext {
  return globalContext;
}

export default useGlobalContext;
