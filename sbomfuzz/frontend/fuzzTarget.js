import * as toml from "toml"; // you may need to `npm install toml`
import { log } from "./messaging";
// output  { name: string, path: string }[]
export function getFuzzTargets(fuzzDir) {
    log("Reading Cargo.toml at:", cargoTomlPath);
  const cargoTomlPath = path.join(fuzzDir, "Cargo.toml");
  
  if (!fs.existsSync(cargoTomlPath)) {
    console.error("Missing fuzz/Cargo.toml");
    return [];
  }

  const tomlRaw = fs.readFileSync(cargoTomlPath, "utf8");
  const parsed = toml.parse(tomlRaw);

  // Extract the `[[bin]]` entries
  const bins = parsed["bin"] || [];

  return bins
    .filter(
      (entry) =>
        typeof entry.name === "string" && typeof entry.path === "string"
    )
    .map((entry) => ({
      name: entry.name,
      path: path.join(fuzzDir, entry.path),
    }));
}
