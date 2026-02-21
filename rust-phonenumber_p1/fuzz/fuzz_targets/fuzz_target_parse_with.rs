#![no_main]

extern crate libfuzzer_sys;
extern crate phonenumber;

use libfuzzer_sys::fuzz_target;
use phonenumber::{parser::parse_with, metadata::DATABASE};

fuzz_target!(|data: &[u8]| {
    // Attempt to convert the input data to a string, which is a common input type for parsing functions.
    if let Ok(input) = std::str::from_utf8(data) {
        // Use the default metadata and a default region code, as parse_with requires them.
        let metadata = &DATABASE;
        let _ = parse_with(metadata, None, input);
    }
});