#![no_main]

// This fuzzing harness targets the `subtract` function from the `program_a` crate's `arithmetic` module.
// It generates random inputs to test the function's behavior under various conditions.

use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::subtract;

// Define the fuzz target for the `subtract` function.
fuzz_target!(|data: (i32, i32)| {
    // Call the function with the fuzzed input.
    let (a, b) = data;
    let _ = subtract(a, b);
});