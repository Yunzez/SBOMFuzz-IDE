#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::parse;
use phonenumber::country::Id;

fuzz_target!(|data: &[u8]| {
    let input_str = std::str::from_utf8(data).unwrap_or_default();
    let _ = parse(Some(Id::US), input_str);
});