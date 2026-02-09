#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::evaluate_expression;

fuzz_target!(|data: &[u8]| {
    if let Ok(expression) = std::str::from_utf8(data) {
        let _ = evaluate_expression(expression);
    }
});