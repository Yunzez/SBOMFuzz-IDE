# Study Artifact: IDE-Integrated Rust Fuzzing Environment

This repository contains the study artifact for our paper. It includes the VS Code
extension used as the study environment ("fuzzlens"), the LLM harness-generation
pipeline and prompts, both study target programs, and the participant-facing study
materials.

The extension helps Rust developers select fuzzing targets and auto-generates
cargo-fuzz harnesses for targeted, direct function fuzzing. It automates
setup-oriented work (function discovery, harness generation, campaign launch) while
leaving interpretation of fuzzing feedback to the developer.

## Repository layout

| Path | Description |
| --- | --- |
| `fuzzlens/` | The VS Code extension (study environment). Function discovery via rust-analyzer, priority-ranked function list with CodeLens actions, LLM-assisted harness generation with automated compilation repair, and campaign execution in the integrated terminal. |
| `fuzzlens/src/prompt.txt` | Harness-generation prompt template sent to the LLM (reproduced verbatim in the paper appendix). |
| `fuzzlens/src/optimize.txt` | Compilation-repair prompt template (used for up to three repair attempts per harness). |
| `fuzzlens/core/` | Bundled `rust-analyzer` binaries (macOS/Linux) used for function discovery. |
| `fuzzlens/harnessGen/` | Standalone Python prototype of the harness-generation pipeline (superseded by the in-extension TypeScript implementation in `fuzzlens/src/harnessGen.ts`). |
| `program_a_std/` | **Scenario A target**: synthetic arithmetic/parsing crate (~800 LOC) with seeded faults. `Tasks.md` is the participant task sheet used in sessions. |
| `rust-phonenumber-std/` | **Scenario B target**: working copy of `rust-phonenumber` 0.3.2+8.13.9 given to participants. Contains CVE-2023-42444 (panic in the RFC3966 parser). Differs from the pristine checkout only in workspace/fuzz scaffolding and a few visibility (`pub`) adjustments so functions are discoverable by the extension. |
| `rust-phonenumber-6e1d06b1.../` | Pristine checkout of the vulnerable upstream commit (directory name is the upstream commit hash), kept for reference. Includes `phonenumber.cdx.json`, the CycloneDX SBOM consumed by the analysis pipeline. |
| `reference_harnesses/` | Researcher-written reference harnesses for the Scenario B target (RFC3966 parser, `replace`, country parsing), used to validate the study setup. |
| `crate_program_a.graph.json`, `crate_phonenumber.graph.json` | Precomputed static call graphs (function → callees) for the two study targets, produced by the extension's analysis and used for function discovery and target-priority ranking. |
| `crate_bcder.graph.json` | Call graph for the `bcder` crate, used during piloting. |
| `intro_fuzzing.md` | The short fuzzing introduction shown to participants during onboarding (adapted and condensed from public fuzzing handbooks). |

## Running the extension

Prerequisites:

- VS Code with the **esbuild Problem Matchers** extension
- Rust toolchain with `cargo-fuzz` installed (`cargo install cargo-fuzz`)
- An OpenAI API key, configured in VS Code settings as `fuzzlens.apiKey`
  (optionally `fuzzlens.apiBaseUrl` for a custom endpoint)

Then:

```bash
cd fuzzlens
npm install
```

Open the `fuzzlens/` folder in VS Code and press `F5` to launch an Extension
Development Host. In the new window, open one of the target crates (e.g.,
`program_a_std/` or `rust-phonenumber-std/`) to use the extension against it.

## Notes

- Harness generation uses GPT-5 (snapshot `gpt-5-2025-08-07`, temperature 1); see
  the paper appendix for the exact prompts and repair-loop configuration.
- The seeded faults in Scenario A and the CVE in Scenario B are described in the
  paper (Methodology).
- `.fuzzlensignore` files in the target crates exclude paths from function
  discovery.
