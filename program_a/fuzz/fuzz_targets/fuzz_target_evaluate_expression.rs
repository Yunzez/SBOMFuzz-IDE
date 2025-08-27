#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::evaluate_expression;

fuzz_target!(|data: &str| {
    // Fuzzing the evaluate_expression function with string inputs
    let _ = evaluate_expression(data);
});