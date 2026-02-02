#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::apply_operator;

fuzz_target!(|data: &[u8]| {
    // Attempt to convert the input data into a string slice
    if let Ok(input_str) = std::str::from_utf8(data) {
        // Split the input string into parts
        let parts: Vec<&str> = input_str.split_whitespace().collect();
        
        if parts.len() == 3 {
            if let (Ok(lhs), Ok(rhs), Some(op)) = (
                parts[0].parse::<i32>(),
                parts[1].parse::<i32>(),
                parts[2].chars().next()
            ) {
                // Call the function being fuzzed
                let _ = apply_operator(lhs, rhs, op);
            }
        }
    }
});