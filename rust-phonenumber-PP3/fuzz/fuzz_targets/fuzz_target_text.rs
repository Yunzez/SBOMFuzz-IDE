#![no_main]
use libfuzzer_sys::fuzz_target;
use phonenumber::metadata::loader;

fuzz_target!(|data: &[u8]| {
    // Attempt to convert the fuzz input to a string slice
    if let Ok(input) = std::str::from_utf8(data) {
        // Create a reader from the input
        let mut reader = input.as_bytes();
        // Call the `text` function with the fuzz input
        let _ = loader::text(&mut reader, input.as_bytes());
    }
});