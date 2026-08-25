# Fuzzing

Fuzzing is an automated testing technique where a program (the *fuzzer*) runs a piece of code many times with different inputs, trying to trigger crashes or unexpected behavior that might reveal bugs or security vulnerabilities.

Instead of a developer manually writing many test cases, a fuzzer:
- Automatically generates or mutates inputs.
- Runs the code under test with those inputs.
- Watches for crashes and keeps track of which inputs explore new behavior.
  
## Terminology

* **SUT/target:** The System Under Test (SUT) is the piece of software that is being tested. 
* **Fuzzer:**  Fuzz testing, or fuzzing, is an automated software testing method that supplies a SUT with invalid, unexpected, or random data as inputs. The program that implements the fuzzing algorithm is called a fuzzer.
* **Test case:** A test case is the concrete input that is given to the testing harness.
* **Harness:**  A small wrapper function that:
  - Accepts input from the fuzzer.
  - Converts it into the right argument types.
  - Calls the target function (or functions) you want to fuzz.
  - In this study, the IDE extension **auto-generates** harnesses for you. You can open and edit them like normal Rust code.
* **Fuzzing campaign:** One run of the fuzzer. When you click the fuzzing run button in the Extension, you start a campaign: the fuzzer generates inputs, runs the harness+SUT, and records results.
* **Code coverage:** A metric to measure the degree to which the source code of a program is executed.

You do not need to know the exact formulas or internals; we mostly care about how you interpret and use these concepts while working with the tool.


The first step when fuzzing a software package is assessing the fuzz-worthy targets in the package. This is because fuzzing works particularly well with certain code structures and can be more involved with other structures. For instance, fuzzing a parser is straightforward: fuzzing is easy to set up, and finding bugs is very likely. 

Before we introduce typical fuzzing setups, we first want to explain today's default fuzzing strategy: mutation-based evolutionary fuzzing.

## The default fuzzing algorithm is mutation-based and evolutionary

Many modern fuzzers use a **mutation-based, coverage-guided** strategy:

1. Start with one or more initial inputs (a *corpus*).  
2. Run the harness+SUT on these inputs and measure code coverage.  
3. Take inputs that explore new code paths and mutate them (e.g., flipping bits, inserting new bytes into the byte array, or truncating it).
4. Run the new inputs, keep the ones that seem interesting (e.g., increase coverage or cause crashes).  

You can think of it as a feedback loop: inputs that lead to new or surprising behavior are kept and used to generate more inputs.

## Typical fuzzing setup

A fuzzing run usually connects three main pieces:

![Fuzzing setup: the fuzzer runtime feeds inputs to the harness, which invokes the SUT](./setup_workflow.svg "Typical fuzzing setup")

*Figure from the [Trail of Bits Testing Handbook](https://appsec.guide/docs/fuzzing/) (CC BY 4.0).*

- The **fuzzer runtime**: owns the main loop, generates/mutates inputs, tracks coverage and crashes.  
- The **harness**: is the entry point the fuzzer calls; it takes the raw input and calls your code.  
- The **SUT**: is the actual functionality you are testing (e.g., parsing, arithmetic, expression evaluation).

In this study, the IDE extension helps by:

- Suggesting potential fuzz targets inside the SUT.  
- Generating a harness file for a chosen target.  
- Letting you jump directly to the harness and run fuzzing from within the editor.  
- Showing fuzzer output (including crashes and coverage) in the IDE.

## A tiny example
Here is a small example of code with a bug and a matching harness, adapted from common fuzzing tutorials.

**Example code with a bug that causes an abort. The `check_buf` function aborts for the input "abc"**.
```Rust
use std::process;

fn check_buf(buf: &[u8]) {
    if buf.len() > 0 && buf[0] == b'a' {
        if buf.len() > 1 && buf[1] == b'b' {
            if buf.len() > 2 && buf[2] == b'c' {
                process::abort(); // I AM BUG
            }
        }
    }
}

fn main() {
    let buffer: &[u8] = b"123";
    check_buf(buffer);
}
```


**Simple rust `cargo fuzz` style harness:**

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;

// Defines the fuzzing harness that cargo-fuzz/libFuzzer will call
fuzz_target!(|data: &[u8]| {
    check_buf(data);
});
```

The fuzzer’s job is to automatically discover an input like `b"abc"` that makes `check_buf` abort, without a human having to think of that specific combination.

In your tasks, you will not be writing these harnesses from scratch—the IDE extension will generate them. You will focus on:

- Choosing targets.  
- Inspecting and (optionally) editing harnesses.  
- Running fuzzing campaigns from the IDE.  
- Interpreting the output (crashes, coverage, other fields) to decide what to do next.  


## Writing/Fixing harnesses

In this study, the IDE extension auto-generates harnesses. Sometimes the harness does not compile or does not correctly construct inputs. You may need to fix it. Here, we provide more techniques on harness construction. 

### Requesting inputs

`fuzz_target!` takes all kinds of simple types. You can request many standard Rust types directly. You can request multiple values directly from the fuzzer in the form of a tuple:

```rust
use libfuzzer_sys::fuzz_target;

// The fuzzer generates a single tuple containing all three types
fuzz_target!(|data: (String, Vec<u32>, bool)| {
    let (name, payload, flag) = data;
    your_project::process(&name, payload, flag);
});
```

**Using Structs**

For input that has complex types, defining a struct with #[derive(Arbitrary)] is clearer and easier to maintain.
```rust
use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;

#[derive(Arbitrary, Debug)]
struct MyInputs {
    name: String,
    payload: Vec<u8>,
}

fuzz_target!(|input: MyInputs| {
    your_project::process(input.name, input.payload);
});
```
