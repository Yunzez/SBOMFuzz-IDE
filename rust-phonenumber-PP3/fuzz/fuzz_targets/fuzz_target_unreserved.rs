#![no_main]

// Importing the necessary crates and modules for fuzzing
use libfuzzer_sys::fuzz_target;
use phonenumber::rfc3966::unreserved;

// Fuzz target for the `unreserved` function
fuzz_target!(|data: &[u8]| {
    // Convert the input data to a string, ignoring invalid UTF-8 sequences
    if let Ok(data_str) = std::str::from_utf8(data) {
        // Iterate over each character in the string and apply the `unreserved` function
        for c in data_str.chars() {
            let _ = unreserved(c);
        }
    }
});