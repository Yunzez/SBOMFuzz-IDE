#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::parser::rfc3966::parameter_unreserved;

fuzz_target!(|data: &[u8]| {
    // Attempt to convert the input data to a string, if possible
    if let Ok(input) = std::str::from_utf8(data) {
        // Iterate over each character in the input string
        for c in input.chars() {
            // Call the function with each character
            let _ = parameter_unreserved(c);
        }
    }
});