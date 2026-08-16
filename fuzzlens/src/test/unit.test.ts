import { describe, it, expect } from "vitest";
import { parseFunctionLocation } from "../functionOutputProcesser";
import { removeBinEntryFromToml } from "../harnessGen";

// ─── parseFunctionLocation ────────────────────────────────────────────────────

describe("parseFunctionLocation", () => {
  it("parses a valid location string", () => {
    const result = parseFunctionLocation("/src/lib.rs|offset=42");
    expect(result).toEqual({ filePath: "/src/lib.rs", offset: 42 });
  });

  it("returns undefined when offset separator is missing", () => {
    expect(parseFunctionLocation("/src/lib.rs")).toBeUndefined();
  });

  it("returns undefined when offset is not a number", () => {
    expect(parseFunctionLocation("/src/lib.rs|offset=abc")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(parseFunctionLocation("")).toBeUndefined();
  });

  it("handles offset=0", () => {
    const result = parseFunctionLocation("/src/main.rs|offset=0");
    expect(result).toEqual({ filePath: "/src/main.rs", offset: 0 });
  });
});

// ─── removeBinEntryFromToml ───────────────────────────────────────────────────

const TOML_HEADER = `[package]
name = "fuzz"
version = "0.0.1"
`;

function makeBinEntry(name: string): string {
  return `\n[[bin]]\nname = "${name}"\npath = "fuzz_targets/${name}.rs"\ntest = false\ndoc = false\nbench = false`;
}

describe("removeBinEntryFromToml", () => {
  it("removes the only [[bin]] entry", () => {
    const toml = TOML_HEADER + makeBinEntry("fuzz_target_foo");
    const { result, found } = removeBinEntryFromToml(toml, "fuzz_target_foo");
    expect(found).toBe(true);
    expect(result).not.toContain("fuzz_target_foo");
    expect(result).toContain("[package]");
  });

  it("returns found=false when target is absent", () => {
    const toml = TOML_HEADER + makeBinEntry("fuzz_target_bar");
    const { result, found } = removeBinEntryFromToml(toml, "fuzz_target_foo");
    expect(found).toBe(false);
    expect(result).toContain("fuzz_target_bar");
  });

  it("removes only the matching entry when multiple entries exist", () => {
    const toml = TOML_HEADER + makeBinEntry("fuzz_target_foo") + makeBinEntry("fuzz_target_bar");
    const { result, found } = removeBinEntryFromToml(toml, "fuzz_target_foo");
    expect(found).toBe(true);
    expect(result).not.toContain('"fuzz_target_foo"');
    expect(result).toContain('"fuzz_target_bar"');
  });

  it("removes entry that appears last in the file", () => {
    const toml = TOML_HEADER + makeBinEntry("fuzz_target_foo") + makeBinEntry("fuzz_target_last");
    const { result, found } = removeBinEntryFromToml(toml, "fuzz_target_last");
    expect(found).toBe(true);
    expect(result).not.toContain('"fuzz_target_last"');
    expect(result).toContain('"fuzz_target_foo"');
  });

  it("removes entry that appears first in the file", () => {
    const toml = TOML_HEADER + makeBinEntry("fuzz_target_first") + makeBinEntry("fuzz_target_bar");
    const { result, found } = removeBinEntryFromToml(toml, "fuzz_target_first");
    expect(found).toBe(true);
    expect(result).not.toContain('"fuzz_target_first"');
    expect(result).toContain('"fuzz_target_bar"');
  });

  it("leaves file unchanged (content-wise) when no [[bin]] sections exist", () => {
    const toml = TOML_HEADER;
    const { result, found } = removeBinEntryFromToml(toml, "fuzz_target_foo");
    expect(found).toBe(false);
    expect(result).toBe(toml);
  });
});
