import fs from "fs";
import path from "path";

const DEFAULT_EXCLUDE_FILE = ".sbomfuzzignore";

function normalizePath(p: string): string {
  return path.resolve(p);
}

export function getExcludeFilePath(root?: string): string | undefined {
  if (!root) {
    return undefined;
  }
  return path.join(root, DEFAULT_EXCLUDE_FILE);
}

export type ExcludePaths = {
  files: Set<string>;
  dirs: Set<string>;
};

function normalizeDir(p: string): string {
  const normalized = path.resolve(p);
  return normalized.endsWith(path.sep) ? normalized : normalized + path.sep;
}

export function loadExcludedFilePaths(projectRoot?: string): ExcludePaths {
  const roots = [projectRoot].filter(
    (root): root is string => Boolean(root)
  );

  const files = new Set<string>();
  const dirs = new Set<string>();

  for (const root of roots) {
    const excludeFilePath = getExcludeFilePath(root);
    if (!excludeFilePath || !fs.existsSync(excludeFilePath)) {
      continue;
    }

    const raw = fs.readFileSync(excludeFilePath, "utf8");
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    for (const line of lines) {
      const isDir = line.endsWith("/") || line.endsWith(path.sep);
      const resolved = path.isAbsolute(line)
        ? normalizePath(line)
        : normalizePath(path.join(root, line));
      if (isDir) {
        dirs.add(normalizeDir(resolved));
      } else {
        files.add(resolved);
      }
    }
  }

  return { files, dirs };
}

export function isFileExcluded(
  filePath: string | undefined,
  excludedPaths: ExcludePaths
): boolean {
  if (!filePath) {
    return false;
  }
  if (excludedPaths.files.size === 0 && excludedPaths.dirs.size === 0) {
    return false;
  }
  const normalized = normalizePath(filePath);
  if (excludedPaths.files.has(normalized)) {
    return true;
  }
  for (const dir of excludedPaths.dirs) {
    if (normalized.startsWith(dir)) {
      return true;
    }
  }
  return false;
}
