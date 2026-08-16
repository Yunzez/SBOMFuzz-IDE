 #![no_main]

// Import necessary crates and modules
use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::apply_operator;

// Define the fuzz target for `apply_operator`
fuzz_target!(|data: (i32, i32, char)| {
    // Extract the tuple into lhs, rhs, and op
    let (lhs, rhs, op) = data;
    
    // Call the function with fuzzed inputs
    let _ = apply_operator(lhs, rhs, op);
});