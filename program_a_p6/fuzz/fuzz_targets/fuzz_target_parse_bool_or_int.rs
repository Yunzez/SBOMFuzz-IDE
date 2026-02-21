#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::parser::parse_bool_or_int;

fuzz_target!(|data: &[u8]| {
    if let Ok(input) = std::str::from_utf8(data) {
        let _ = parse_bool_or_int(input);
    }
});