#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::parser::rfc3966::separator;

fuzz_target!(|data: &[u8]| {
    // Attempt to convert the input data to a string, defaulting to an empty string on failure
    let input = std::str::from_utf8(data).unwrap_or_default();
    
    // Iterate over each character in the input string and call the separator function
    for c in input.chars() {
        let _ = separator(c);
    }
});