#![no_main]
use libfuzzer_sys::fuzz_target;
use phonenumber::parse;

fuzz_target!(|data: &[u8]| {
    // Attempt to convert the byte slice into a UTF-8 string, using a default if it fails
    if let Ok(input) = std::str::from_utf8(data) {
        // Call the `parse` function with the input string
        let _ = parse(None, input);
    }
});