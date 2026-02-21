#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::parser::extract_first_number;

fuzz_target!(|data: &[u8]| {
    // Convert the input data to a string, handling any invalid UTF-8 by using a default.
    if let Ok(input) = std::str::from_utf8(data) {
        // Call the function with the fuzzed input.
        let _ = extract_first_number(input);
    }
});