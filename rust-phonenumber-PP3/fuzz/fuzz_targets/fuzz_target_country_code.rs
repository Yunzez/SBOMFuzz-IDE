#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::parser::helper::{country_code, Number};
use phonenumber::metadata::DATABASE;

fuzz_target!(|data: &[u8]| {
    if let Ok(input) = std::str::from_utf8(data) {
        if let Ok(number) = input.parse::<Number>() {
            let _ = country_code(&DATABASE, None, number);
        }
    }
});