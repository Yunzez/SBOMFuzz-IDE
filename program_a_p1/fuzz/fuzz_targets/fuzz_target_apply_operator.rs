#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::apply_operator;
use arbitrary::Arbitrary;

// Define a fuzzing target for the `apply_operator` function
fuzz_target!(|data: (char, i32, i32)| {
    // Destructure the tuple to get the operator and operands
    let (operator, left_operand, right_operand) = data;

    // Apply the operator using the provided function
    // Handle any potential panics or errors gracefully
    let _ = apply_operator(left_operand, right_operand, operator);
});