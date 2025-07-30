#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::evaluate_expression;

fuzz_target!(|data: &str| {
    // Fuzz the evaluate_expression function with string input
    let _ = evaluate_expression(data);
});