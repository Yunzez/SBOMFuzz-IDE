#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::apply_operator;

fuzz_target!(|data: (i32, i32, char)| {
    let (lhs, rhs, op) = data;
    // Apply the operator to the given integers
    let _ = apply_operator(lhs, rhs, op);
});