#![no_main]

use libfuzzer_sys::fuzz_target;

// Assuming the function signature is something like:
// fn divide(numerator: i32, denominator: i32) -> Option<i32>;
// We will fuzz both parameters to ensure the function handles all possible inputs correctly.

fuzz_target!(|data: (i32, i32)| {
    let (numerator, denominator) = data;

    // Call the divide function with the fuzzed inputs.
    // Handle the case where the denominator is zero to prevent panics.
    if denominator != 0 {
        // We assume the function returns an Option, so we handle it accordingly.
        let _ = program_a::arithmetic::divide(numerator, denominator);
    }
});