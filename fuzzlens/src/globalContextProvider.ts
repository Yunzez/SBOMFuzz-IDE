/**
 * @fileoverview
 * Provides a global context provider for the FuzzLens-IDE VSCode extension.
 *
 * This module manages shared state across the extension, including the fuzz root,
 * project root, and analysis results. It exposes functions to initialize and access
 * this global context, and integrates with project analysis utilities.
 *
 * @module globalContextProvider
 */
import path from "path";
import fs from "fs";
import type * as vscode from "vscode";
import { FunctionResult, loadFunctionResults } from "./functionOutputProcesser";
import { findCargoProjectRoot, findFuzzRoot, getFuzzTargets } from "./util";
import {
  applyHarnessMetadata,
  applyHarnessMetadataToTargets,
} from "./harnessRegistry";

export interface SharedContext {
  fuzzTargets: {
    name: string;
    path: string;
    target_function?: string;
    functionKey?: string;
    functionName?: string;
  }[];
  fuzzRoot?: string;
  projectRoot?: string;
  extensionPath?: string;
  results?: FunctionResult[];
}

const globalContext: SharedContext = {
  fuzzRoot: undefined,
  projectRoot: undefined,
  extensionPath: undefined,
  results: [],
  fuzzTargets: [],
};

export async function useGlobalContext(context: vscode.ExtensionContext) {
  const projectPath = context.extensionPath;
  const fuzzRoot = findFuzzRoot();
  const root = findCargoProjectRoot();
  const outputPath = path.join(projectPath, "output");

  console.log("GC Project root:", root);
  console.log("GC Fuzz root:", fuzzRoot);

  globalContext.projectRoot = root;
  globalContext.fuzzRoot = fuzzRoot;
  globalContext.extensionPath = projectPath;
  globalContext.fuzzTargets = fuzzRoot
    ? applyHarnessMetadataToTargets(getFuzzTargets(fuzzRoot))
    : [];

  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { recursive: true, force: true });
  }
  fs.mkdirSync(outputPath, { recursive: true });

  const results = loadFunctionResults(outputPath) ?? [];
  applyHarnessMetadata(results);
  console.log("GC loaded results count:", results.length);
  globalContext.results = results;

  return getGlobalContext();
}

export function getGlobalContext(): SharedContext {
  return globalContext;
}

export default useGlobalContext;
