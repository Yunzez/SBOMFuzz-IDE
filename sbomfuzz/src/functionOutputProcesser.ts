import * as fs from "fs";
import path from "path";
import { getGlobalContext } from "./globalContextProvider";
import { isFileExcluded, loadExcludedFilePaths } from "./excludeList";
export type FunctionResult = {
  functionKey: string;
  functionName: string;
  functionCrate: string;
  functionModulePath: string;
  functionDescription: string;
  functionParameters: Record<string, string>;
  functionLocation?: FunctionLocation;
  paramCount: number;
  usageCount: number;
  centralityScore: number;
  unsafeScore: number;
  priorityScore: number;
  status: FunctionStatus;
  harnessPath?: string;
  harnessTargetName?: string;
  harnessOptimized?: boolean;
  pendingGeneration?: boolean;
};

export enum FunctionStatus {
  NoHarness = "No Harness",
  Ignore = "Ignore",
  HarnessGenerated = "HarnessGenerated",
}

function findAllFunctionsFile(outputPath: string): string | undefined {
  if (!fs.existsSync(outputPath) || !fs.statSync(outputPath).isDirectory()) {
    console.error(`Output path is not a directory: ${outputPath}`);
    return undefined;
  }

  const files = fs.readdirSync(outputPath);
  const match = files.find((file) => file.includes("_all_functions.txt"));

  if (!match) {
    console.error("No *_all_functions.txt file found.");
    return undefined;
  }

  return path.join(outputPath, match);
}

export function loadFunctionResults(
  outputPath?: string
): FunctionResult[] | undefined {
  if (!outputPath) {
    return undefined;
  }

  const resultFilePath = findAllFunctionsFile(outputPath);
  if (!resultFilePath) {
    return undefined;
  }

  console.log(`Rust analyzer result processed, output path: ${resultFilePath}`);

  if (!fs.existsSync(resultFilePath)) {
    console.error(`Output file not found: ${resultFilePath}`);
    return undefined;
  }

  const data = fs.readFileSync(resultFilePath, "utf8");
  const lines = data.split("\n");
  const result: Record<string, any> = {};
  let currentKey = "";

  for (const line of lines) {
    if (line.startsWith("Function Key:")) {
      currentKey = line.replace("Function Key:", "").trim();
      result[currentKey] = {};
    } else if (line.startsWith("-") && currentKey) {
      const fieldLine = line.slice(1).trim();
      const sepIdx = fieldLine.indexOf(":");
      if (sepIdx !== -1) {
        const field = fieldLine.slice(0, sepIdx).trim();
        const value = fieldLine.slice(sepIdx + 1).trim();
        result[currentKey][field] = value;
      }
    }
  }
  const globalContext = getGlobalContext();
  const excludedPaths = loadExcludedFilePaths(globalContext.projectRoot);
  const fuzzTargetKeys = new Set(
    (globalContext.fuzzTargets || [])
      .map((t: any) => t.functionKey)
      .filter(Boolean)
  );
  console.log("Fuzz target names:", globalContext.fuzzTargets);
  // Return all parsed FunctionResults if available
  const keys = Object.keys(result);
  if (keys.length > 0) {
    const entries = keys.map((key) => {
      const r = result[key];
      const functionName = r["Function Name"] || "";
      console.log(r.functionName);
      const functionLocation = parseFunctionLocation(r["Location"]);
      return {
        functionKey: key,
        functionName,
        functionCrate: r["Crate"] || "",
        functionModulePath:
          (r["Module Path"] || "").split("::").slice(1).join("::") || "",
        functionDescription: r["Function Description"] || "",
        functionParameters: r["Parameters"],
        functionLocation,
        paramCount: parseInt(r["Number of Parameters"]),
        usageCount: parseInt(r["Count"], 10) || 0,
        centralityScore: parseFloat(r["Centrality Score"]),
        unsafeScore: parseFloat(r["Unsafe Score"]),
        priorityScore: parseFloat(r["Priority Score"]),
        status: fuzzTargetKeys.has(key)
          ? FunctionStatus.HarnessGenerated
          : FunctionStatus.NoHarness,
      };
    });

    ensureNaturalPhoneNumberEntry(
      entries,
      resultFilePath,
      globalContext.projectRoot
    );
    ensureValidatorIsViableEntry(
      entries,
      resultFilePath,
      globalContext.projectRoot
    );

    return entries.filter(
      (fn) => !isFileExcluded(fn.functionLocation?.filePath, excludedPaths)
    );
  }

  return undefined;
}

export type FunctionLocation = {
  filePath: string;
  offset: number;
};

// STUDY-SPECIFIC: Injects a hardcoded entry for `parser::natural::phone_number`
// from the `phonenumber` crate for a specific research participant's project.
// Also appends to the results file on disk as a side effect.
// Remove or gate behind a config flag for general use.
function ensureNaturalPhoneNumberEntry(
  entries: FunctionResult[],
  resultFilePath: string,
  projectRoot?: string
): void {
  const modulePath = "parser::natural";
  const functionName = "phone_number";
  const locationPath = projectRoot
    ? path.join(projectRoot, "src", "parser", "natural.rs")
    : "";
  const expectedLocation = locationPath
    ? `${locationPath}|offset=713`
    : "";

  const exists = entries.some(
    (entry) =>
      entry.functionName === functionName &&
      entry.functionModulePath === modulePath &&
      entry.functionLocation?.filePath === locationPath
  );
  if (exists) {
    return;
  }

  const functionKey = "10000000000000000";
  const recordLines = [
    "",
    `Function Key: ${functionKey}`,
    "- Macro: false",
    "- Crate: phonenumber",
    "- From Crate: phonenumber",
    "- Module Path: phonenumber::parser::natural",
    "- Use Statement: None",
    "- Function Name: phone_number",
    "- Parameters: ",
    "- Is Entry Node: false",
    `- Location: ${expectedLocation || "unknown"}`,
    "- Count: 1",
    "- Unsafe Score: 0",
    "- Number of Parameters: 1",
    "- Centrality Score: 0.0038938841419146365",
    "- Priority Score: 0.20672372",
    "",
  ].join("\n");

  try {
    fs.appendFileSync(resultFilePath, recordLines, "utf8");
  } catch (err) {
    console.error("Failed to append natural::phone_number to results file:", err);
  }

  if (!locationPath) {
    return;
  }

  entries.push({
    functionKey,
    functionName,
    functionCrate: "phonenumber",
    functionModulePath: modulePath,
    functionDescription: "",
    functionParameters: {},
    functionLocation: { filePath: locationPath, offset: 613 },
    paramCount: 1,
    usageCount: 1,
    centralityScore: 0.0038938841419146365,
    unsafeScore: 0,
    priorityScore: 0.20672372,
    status: FunctionStatus.NoHarness,
  });
}

// STUDY-SPECIFIC: Injects a hardcoded entry for `validator::is_viable` from the
// `phonenumber` crate. The backend analyzer misses this function due to its
// generic type parameter `<S: AsRef<str>>`.
function ensureValidatorIsViableEntry(
  entries: FunctionResult[],
  resultFilePath: string,
  projectRoot?: string
): void {
  const modulePath = "validator";
  const functionName = "is_viable";
  const locationPath = projectRoot
    ? path.join(projectRoot, "src", "validator.rs")
    : "";
  const expectedLocation = locationPath
    ? `${locationPath}|offset=2626`
    : "";

  const exists = entries.some(
    (entry) =>
      entry.functionName === functionName &&
      entry.functionModulePath === modulePath &&
      entry.functionLocation?.filePath === locationPath
  );
  if (exists) {
    return;
  }

  const functionKey = "10000000000000001";
  const recordLines = [
    "",
    `Function Key: ${functionKey}`,
    "- Macro: false",
    "- Crate: phonenumber",
    "- From Crate: phonenumber",
    "- Module Path: phonenumber::validator",
    "- Use Statement: None",
    "- Function Name: is_viable",
    "- Parameters: string: S",
    "- Is Entry Node: false",
    `- Location: ${expectedLocation || "unknown"}`,
    "- Count: 1",
    "- Unsafe Score: 0",
    "- Number of Parameters: 1",
    "- Centrality Score: 0.01",
    "- Priority Score: 0.25",
    "",
  ].join("\n");

  try {
    fs.appendFileSync(resultFilePath, recordLines, "utf8");
  } catch (err) {
    console.error("Failed to append validator::is_viable to results file:", err);
  }

  if (!locationPath) {
    return;
  }

  entries.push({
    functionKey,
    functionName,
    functionCrate: "phonenumber",
    functionModulePath: modulePath,
    functionDescription: "Check if the provided string is a viable phone number.",
    functionParameters: { string: "S" },
    functionLocation: { filePath: locationPath, offset: 2626 },
    paramCount: 1,
    usageCount: 1,
    centralityScore: 0.01,
    unsafeScore: 0,
    priorityScore: 0.25,
    status: FunctionStatus.NoHarness,
  });
}

export function parseFunctionLocation(locationStr: string):
  | {
      filePath: string;
      offset: number;
    }
  | undefined {
  if (!locationStr || !locationStr.includes("|offset=")) {
    return undefined;
  }

  const [filePath, offsetStr] = locationStr.split("|offset=");
  const offset = parseInt(offsetStr, 10);

  if (isNaN(offset)) {
    return undefined;
  }

  return {
    filePath,
    offset,
  };
}
