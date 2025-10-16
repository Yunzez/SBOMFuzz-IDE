#![no_main]
use libfuzzer_sys::fuzz_target;
use phonenumber::metadata::loader::load_formats;
use std::io::Cursor;
use phonenumber::metadata::Metadata;

fuzz_target!(|data: &[u8]| {
    // Create a Cursor from the fuzzed data to simulate a reader.
    let mut reader = Cursor::new(data);
    
    // Create a dummy Metadata object. You might need to adjust this based on your actual Metadata structure.
    let meta = Metadata::default();

    // Attempt to call the `load_formats` function with fuzzed data.
    // Use unwrap_or_default() to handle potential errors gracefully.
    load_formats(&mut reader, &meta, data).unwrap_or_default();
});