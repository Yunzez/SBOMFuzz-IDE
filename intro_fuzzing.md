# Fuzzing: Short Intro for Study Participants

This document is a quick, practical introduction to fuzzing for the usability study. It is meant to give you enough background to understand what the tool is doing and how to work with it; you do **not** need to remember every term.

## 1. What is fuzzing?

Fuzzing is an automated testing technique where a program (the *fuzzer*) runs a piece of code many times with different inputs, trying to trigger crashes or unexpected behavior that might reveal bugs or security vulnerabilities.

Instead of a developer manually writing many test cases, a fuzzer:

- Automatically generates or mutates inputs.
- Runs the code under test with those inputs.
- Watches for crashes and keeps track of which inputs explore new behavior.

## 2. Key terminology (just the essentials)

- **System Under Test (SUT) / target**  
  The code you care about. In this study, the Rust library in the project (e.g., `src/*.rs`) is the SUT.

- **Fuzzer**  
  The program that generates inputs, runs the harness, and manages the fuzzing campaign.

- **Test case / input**  
  One concrete input the fuzzer passes to the harness. Often a byte string (`&[u8]`) but can be other types.

- **Harness**  
  A small wrapper function that:
  - Accepts input from the fuzzer.
  - Converts it into the right argument types.
  - Calls the target function (or functions) you want to fuzz.

  In this study, the IDE extension **auto-generates** harnesses for you. You can open and edit them like normal Rust code.

- **Fuzzing campaign**  
  One run of the fuzzer. When you click the fuzzing run button in the IDE, you start a campaign: the fuzzer generates inputs, runs the harness+SUT, and records results.

- **Code coverage**  
  A rough metric of "how much of the code has been executed by the current set of inputs." Fuzzers often use coverage to decide which inputs are interesting to keep and mutate further.

You do not need to know the exact formulas or internals; we mostly care about how you interpret and use these concepts while working with the tool.

## 3. How modern fuzzers work (high level)

Many modern fuzzers use a **mutation-based, coverage-guided** strategy:

1. Start with one or more initial inputs (a *corpus*).  
2. Run the harness+SUT on these inputs and measure code coverage.  
3. Take inputs that explore new code paths and mutate them (flip bits, change bytes, etc.).  
4. Run the new inputs, keep the ones that seem interesting (e.g., increase coverage or cause crashes).  
5. Repeat this loop during the fuzzing campaign.

You can think of it as a feedback loop: inputs that lead to new or surprising behavior are kept and used to generate more inputs.

## 4. Typical fuzzing setup

A fuzzing run usually connects three main pieces:

```text
   +-----------------+       +-----------------+       +-----------------+
   |  Fuzzer runtime | ----> |    Harness      | ----> |   SUT / target  |
   | (libFuzzer, etc)|       | (wrapper fn)    |       |  (your library) |
   +-----------------+       +-----------------+       +-----------------+
            ^                        |                          |
            |                        |                          |
            +------------------------+--------------------------+
                         crashes, coverage, logs
```

- The **fuzzer runtime**: owns the main loop, generates/mutates inputs, tracks coverage and crashes.  
- The **harness**: is the entry point the fuzzer calls; it takes the raw input and calls your code.  
- The **SUT**: is the actual functionality you are testing (e.g., parsing, arithmetic, expression evaluation).

In this study, the IDE extension helps by:

- Suggesting potential fuzz targets inside the SUT.  
- Generating a harness file for a chosen target.  
- Letting you jump directly to the harness and run fuzzing from within the editor.  
- Showing fuzzer output (including crashes and coverage) in the IDE.

## 5. A tiny example

Here is a small example of code with a bug and a matching harness, adapted from common fuzzing tutorials.

**Buggy target code (SUT):**

```rust
use std::process;

fn check_buf(buf: &[u8]) {
    if buf.len() > 0 && buf[0] == b'a' {
        if buf.len() > 1 && buf[1] == b'b' {
            if buf.len() > 2 && buf[2] == b'c' {
                process::abort(); // simulated crash / bug
            }
        }
    }
}
```

**Simple `cargo fuzz`-style harness:**

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;

// Defines the fuzzing harness that cargo-fuzz/libFuzzer will call
fuzz_target!(|data: &[u8]| {
    check_buf(data);
});
```

This is the standard `cargo fuzz` pattern: the `fuzz_target!` macro declares the harness function that the fuzzer will call repeatedly with different inputs.*** End Patch ***!

The fuzzer’s job is to automatically discover an input like `b"abc"` that makes `check_buf` abort, without a human having to think of that specific combination.

In your tasks, you will not be writing these harnesses from scratch—the IDE extension will generate them. You will focus on:

- Choosing targets.  
- Inspecting and (optionally) editing harnesses.  
- Running fuzzing campaigns from the IDE.  
- Interpreting the output (crashes, coverage, other fields) to decide what to do next.  

That is all the background you need for the study. You are not expected to know or remember the details of fuzzing internals; we are interested in how you understand and use the tool while working with realistic code.
