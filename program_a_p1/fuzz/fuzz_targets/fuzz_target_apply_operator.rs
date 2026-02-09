#![no_main]

use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;
use program_a::expr_eval::apply_operator;

// Define a structure to represent the input for the `apply_operator` function.
#[derive(Arbitrary, Debug)]
struct FuzzInput {
    operator: char,
    operand1: i32,
    operand2: i32,
}

// The fuzz target is defined here. It will be called with a variety of inputs.
fuzz_target!(|data: FuzzInput| {
    // Call the `apply_operator` function with the fuzzed inputs.
    // Handle any potential panics or errors gracefully.
    let _ = apply_operator(data.operand1, data.operand2, data.operator);
});