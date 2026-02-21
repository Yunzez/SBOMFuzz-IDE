#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::parser::parse_hex;
use std::str;

fuzz_target!(|data: &[u8]| {
    // Attempt to parse the input data as a hex string.
    if let Ok(hex_str) = str::from_utf8(data) {
        let _ = parse_hex(hex_str);
    }
});