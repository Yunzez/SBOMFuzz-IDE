import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";

export type FunctionResult = {
  functionKey: string;
  functionName: string;
  functionCrate: string;
  functionModulePath: string;
  functionDescription: string;
  functionParameters: Record<string, string>;
  functionLocation?: FunctionLocation;
};

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

  vscode.window.showInformationMessage(
    `Rust analyzer resuted processed, checking output path: ${resultFilePath}`
  );

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

  // Return all parsed FunctionResults if available
  const keys = Object.keys(result);
  if (keys.length > 0) {
    return keys.map((key) => {
      const r = result[key];
      return {
        functionKey: key,
        functionName: r["Function Name"] || "",
        functionCrate: r["Crate"] || "",
        functionModulePath: r["Module Path"] || "",
        functionDescription: r["Function Description"] || "",
        functionParameters: r["Parameters"],
        functionLocation: parseFunctionLocation(r["Location"]),
      };
    });
  }

  vscode.window.showInformationMessage(
    `Rust analyzer resuted processed, ${result.length} functions found`
  );

  return undefined;
}

export type FunctionLocation = {
    filePath: string;
    offset: number;
};

export function parseFunctionLocation(locationStr: string): {
  filePath: string;
  offset: number;
} | undefined {
  if (!locationStr || !locationStr.includes("|offset=")) {return undefined;}

  const [filePath, offsetStr] = locationStr.split("|offset=");
  const offset = parseInt(offsetStr, 10);

  if (isNaN(offset)) {return undefined;}

  return {
    filePath,
    offset
  };
}
