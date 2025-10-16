#![no_main]
use libfuzzer_sys::fuzz_target;
use phonenumber::parser::helper::trim;
use std::borrow::Cow;

fuzz_target!(|data: &[u8]| {
    // Convert the fuzz input to a string, using lossy conversion to handle invalid UTF-8 gracefully
    let input = String::from_utf8_lossy(data);
    
    // Call the trim function with the fuzz input and a starting index
    let _ = trim(input, 0);
});