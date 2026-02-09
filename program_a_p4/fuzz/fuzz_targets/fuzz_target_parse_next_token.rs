#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::expr_eval::parse_next_token;

fuzz_target!(|data: &[u8]| {
    // Attempt to parse the input data as a string, or use an empty string if conversion fails
    let input = std::str::from_utf8(data).unwrap_or_default();
    
    // Call the function with the input
    let _ = parse_next_token(input);
});