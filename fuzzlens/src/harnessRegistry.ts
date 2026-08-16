import * as fs from "fs";
import * as vscode from "vscode";
import { FunctionResult, FunctionStatus } from "./functionOutputProcesser";

/**
 * Describes a persisted link between a Rust analyzer function (identified by
 * `functionKey`) and the fuzz harness we generated for it.
 */
type HarnessRecord = {
  functionKey: string;
  functionName: string;
  functionFilePath?: string;
  targetName: string;
  harnessPath: string;
  optimized?: boolean;
  createdAt: number;
};

export type FuzzTarget = {
  name: string;
  path: string;
  target_function?: string;
  functionKey?: string;
  functionName?: string;
};

const STORAGE_KEY = "fuzzlens.harnessRegistry";

let registry = new Map<string, HarnessRecord>();
let extensionContext: vscode.ExtensionContext | undefined;

function toObject(store: Map<string, HarnessRecord>) {
  return Object.fromEntries(store.entries());
}

function fromObject(obj: Record<string, HarnessRecord>) {
  return new Map<string, HarnessRecord>(Object.entries(obj ?? {}));
}

/**
 * Initialises the harness registry for the current workspace.
 *
 * Example:
 * ```ts
 * await initHarnessRegistry(context);
 * registerHarnessForFunction(result, "fuzz_target_my_fn", "/path/to/harness.rs");
 * ```
 */
export async function initHarnessRegistry(
  context: vscode.ExtensionContext
): Promise<void> {
  extensionContext = context;
  const stored = context.workspaceState.get<Record<string, HarnessRecord>>(
    STORAGE_KEY,
    {}
  );
  registry = fromObject(stored);
  await pruneMissingHarnesses();
}

function persist() {
  if (!extensionContext) {
    return;
  }
  extensionContext.workspaceState.update(STORAGE_KEY, toObject(registry));
}

/**
 * Removes any entries that point to harness files which no longer exist on disk.
 */
async function pruneMissingHarnesses() {
  let dirty = false;
  for (const [key, record] of registry.entries()) {
    if (!fs.existsSync(record.harnessPath)) {
      registry.delete(key);
      dirty = true;
    }
  }
  if (dirty) {
    persist();
  }
}

/**
 * Stores/updates the harness record backing a `functionKey`.
 */
export function upsertHarnessRecord(record: HarnessRecord) {
  registry.set(record.functionKey, record);
  persist();
}

/**
 * Removes a persisted harness entry using its `functionKey`.
 */
export function removeHarnessRecordByFunctionKey(functionKey: string) {
  if (registry.delete(functionKey)) {
    persist();
  }
}

/**
 * Removes all harness records that map to the provided fuzz target name.
 */
export function removeHarnessRecordByTargetName(targetName: string) {
  let removed = false;
  for (const [key, record] of registry.entries()) {
    if (record.targetName === targetName) {
      registry.delete(key);
      removed = true;
    }
  }
  if (removed) {
    persist();
  }
}

/**
 * Returns the harness record associated with the provided `functionKey`.
 */
export function getHarnessRecord(functionKey: string) {
  return registry.get(functionKey);
}

/**
 * Locates a persisted mapping using the fuzz target name.
 */
export function getHarnessRecordByTargetName(targetName: string) {
  for (const record of registry.values()) {
    if (record.targetName === targetName) {
      return record;
    }
  }
  return undefined;
}

/**
 * Updates optimization status for a harness by target name.
 */
export function setHarnessOptimized(targetName: string, optimized: boolean) {
  let updated = false;
  for (const [key, record] of registry.entries()) {
    if (record.targetName === targetName) {
      registry.set(key, { ...record, optimized });
      updated = true;
    }
  }
  if (updated) {
    persist();
  }
}

/**
 * Enriches fuzz targets with persisted harness metadata (functionKey/functionName).
 */
export function applyHarnessMetadataToTargets<T extends FuzzTarget>(
  targets: T[]
): T[] {
  if (!Array.isArray(targets)) {
    return targets;
  }
  return targets.map((target) => {
    const record = getHarnessRecordByTargetName(target.name);
    if (!record) {
      return target;
    }
    return {
      ...target,
      functionKey: record.functionKey,
      functionName: record.functionName,
    };
  });
}

/**
 * Convenience helper that links a `FunctionResult` (or similar object) to the
 * generated harness on disk.
 *
 * Example:
 * ```ts
 * registerHarnessForFunction(result, targetName, harnessPath);
 * ```
 */
export function registerHarnessForFunction(
  target: {
    functionKey?: string;
    functionName?: string;
    functionLocation?: { filePath?: string };
  },
  targetName: string,
  harnessPath: string,
  options: { optimized?: boolean } = {}
) {
  if (!target?.functionKey) {
    return;
  }
  upsertHarnessRecord({
    functionKey: target.functionKey,
    functionName: target.functionName ?? target.functionKey,
    functionFilePath: target.functionLocation?.filePath,
    targetName,
    harnessPath,
    optimized: options.optimized ?? true,
    createdAt: Date.now(),
  });
}

/**
 * Applies persisted harness metadata to the function results we surface to the
 * rest of the extension.
 */
export function applyHarnessMetadata(results: FunctionResult[]): FunctionResult[] {
  if (!Array.isArray(results)) {
    return results;
  }
  const byFileAndName = new Map<string, HarnessRecord>();
  for (const record of registry.values()) {
    if (record.functionFilePath && record.functionName) {
      byFileAndName.set(
        `${record.functionFilePath}::${record.functionName}`,
        record
      );
    }
  }
  let dirty = false;
  for (const result of results) {
    if (!result?.functionKey) {
      continue;
    }
    let record = registry.get(result.functionKey);
    if (!record && result.functionLocation?.filePath) {
      record = byFileAndName.get(
        `${result.functionLocation.filePath}::${result.functionName}`
      );
      if (record && record.functionKey !== result.functionKey) {
        registry.delete(record.functionKey);
        record = { ...record, functionKey: result.functionKey };
        registry.set(result.functionKey, record);
        dirty = true;
      }
    }
    if (record && fs.existsSync(record.harnessPath)) {
      result.status = FunctionStatus.HarnessGenerated;
      (result as any).harnessPath = record.harnessPath;
      (result as any).harnessTargetName = record.targetName;
      (result as any).harnessOptimized =
        typeof record.optimized === "boolean" ? record.optimized : true;
    } else if (record) {
      registry.delete(result.functionKey);
      dirty = true;
    }
  }
  if (dirty) {
    persist();
  }
  return results;
}

/**
 * Clears all records. Only intended for automated tests.
 */
export function clearHarnessRegistryForTests() {
  registry.clear();
  persist();
}
