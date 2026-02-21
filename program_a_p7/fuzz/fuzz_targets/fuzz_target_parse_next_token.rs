#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::parse_next_token;

fuzz_target!(|data: &[u8]| {
    // Attempt to parse the input data as a string slice
    if let Ok(input) = std::str::from_utf8(data) {
        // Call the function with the input
        parse_next_token(input);
    }
});