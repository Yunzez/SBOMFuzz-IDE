#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::apply_operator;

fuzz_target!(|data: (i32, i32, char)| {
    // Attempt to apply an operator to two integers
    let (a, b, op) = data;

    // Apply the operator and handle any potential errors gracefully
    let _ = apply_operator(a, b, op).unwrap_or_default();
});