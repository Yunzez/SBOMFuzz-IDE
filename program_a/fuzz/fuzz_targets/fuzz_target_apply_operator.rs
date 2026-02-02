#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::apply_operator;

fuzz_target!(|data: (char, i32, i32)| {
    let (operator, operand1, operand2) = data;
    // Attempt to apply the operator to the operands
    let _ = apply_operator(operand1, operand2, operator);
});