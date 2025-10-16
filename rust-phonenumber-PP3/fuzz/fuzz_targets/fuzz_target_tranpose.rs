#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::{parse, country};

fuzz_target!(|data: &[u8]| {
    // Attempt to convert the input data into a string, using default if conversion fails
    let input = std::str::from_utf8(data).unwrap_or_default();
    
    // Call the function with the fuzzed input
    let _ = parse(Some(country::US), input);
});