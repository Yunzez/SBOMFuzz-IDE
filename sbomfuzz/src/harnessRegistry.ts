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
  targetName: string;
  harnessPath: string;
  createdAt: number;
};

const STORAGE_KEY = "sbomfuzz.harnessRegistry";

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
 * Convenience helper that links a `FunctionResult` (or similar object) to the
 * generated harness on disk.
 *
 * Example:
 * ```ts
 * registerHarnessForFunction(result, targetName, harnessPath);
 * ```
 */
export function registerHarnessForFunction(
  target: { functionKey?: string; functionName?: string },
  targetName: string,
  harnessPath: string
) {
  if (!target?.functionKey) {
    return;
  }
  upsertHarnessRecord({
    functionKey: target.functionKey,
    functionName: target.functionName ?? target.functionKey,
    targetName,
    harnessPath,
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
  let dirty = false;
  for (const result of results) {
    if (!result?.functionKey) {
      continue;
    }
    const record = registry.get(result.functionKey);
    if (record && fs.existsSync(record.harnessPath)) {
      result.status = FunctionStatus.HarnessGenerated;
      (result as any).harnessPath = record.harnessPath;
      (result as any).harnessTargetName = record.targetName;
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
