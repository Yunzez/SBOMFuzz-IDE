#![no_main]

// Import necessary crates and modules
use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::evaluate_expression;

// Define the fuzz target using libfuzzer-sys
fuzz_target!(|data: &[u8]| {
    // Convert the input data into a string, which is the expected input type for evaluate_expression
    if let Ok(input) = std::str::from_utf8(data) {
        // Call the function with the fuzzed input
        let _ = evaluate_expression(input);
    }
});