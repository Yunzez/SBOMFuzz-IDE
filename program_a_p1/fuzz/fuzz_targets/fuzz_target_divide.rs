#![no_main]

// Importing necessary crates and modules for fuzzing
use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::divide;

// Fuzz target for the `divide` function
fuzz_target!(|data: (i32, i32)| {
    // Destructuring the tuple to get the two integers
    let (numerator, denominator) = data;

    // Avoid division by zero by skipping such cases
    if denominator != 0 {
        // Call the divide function with the fuzzed inputs
        let _ = divide(numerator, denominator);
    }
});