#![no_main]
use libfuzzer_sys::fuzz_target;
use phonenumber::parse;

fuzz_target!(|data: &[u8]| {
    // Attempt to convert the input data to a valid UTF-8 string
    if let Ok(input) = std::str::from_utf8(data) {
        // Call the parse function with the input string
        let _ = parse(None, input);
    }
});