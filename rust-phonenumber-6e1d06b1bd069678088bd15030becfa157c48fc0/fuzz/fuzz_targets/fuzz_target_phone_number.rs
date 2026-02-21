#![no_main]
use libfuzzer_sys::fuzz_target;
use phonenumber::parse;

fuzz_target!(|data: &[u8]| {
    // Attempt to convert the byte slice to a string
    if let Ok(input) = std::str::from_utf8(data) {
        // Call the parse function with the input string
        let _ = parse(None, input);
    }
});