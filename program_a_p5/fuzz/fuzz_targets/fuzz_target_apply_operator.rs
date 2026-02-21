#![no_main]

// Import necessary crates and modules
use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::apply_operator;

// Define the fuzz target
fuzz_target!(|data: &[u8]| {
    // Convert the input data into a string, or use a default if conversion fails
    let input = std::str::from_utf8(data).unwrap_or_default();

    // Parse input to extract integers and operator
    let mut parts = input.split_whitespace();
    if let (Some(lhs_str), Some(rhs_str), Some(op_str)) = (parts.next(), parts.next(), parts.next()) {
        if let (Ok(lhs), Ok(rhs), Some(op)) = (lhs_str.parse::<i32>(), rhs_str.parse::<i32>(), op_str.chars().next()) {
            // Call the function with the fuzz input
            println!("{} {} {} end",lhs, rhs, op);
            let _ = apply_operator(lhs, rhs, op);
        }
    }
});