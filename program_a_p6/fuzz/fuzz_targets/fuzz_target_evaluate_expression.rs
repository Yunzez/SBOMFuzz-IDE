#![no_main]

// Import necessary crates and modules
use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::evaluate_expression;

// Define the fuzz target
fuzz_target!(|data: &[u8]| {
    // Convert the input data to a string, using default if conversion fails
    if let Ok(expression) = std::str::from_utf8(data) {
        // Call the function with the fuzzed input
        let _ = evaluate_expression(expression);
    }
});