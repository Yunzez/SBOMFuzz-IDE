#![no_main]

// Import necessary crates and modules for fuzzing
use libfuzzer_sys::fuzz_target;
use phonenumber::metadata::loader;
use phonenumber::metadata::Metadata;
use quick_xml::Reader;
use std::io::Cursor;

// Define the fuzz target
fuzz_target!(|data: &[u8]| {
    // Create a Reader from the input data
    let mut reader = Reader::from_reader(Cursor::new(data));

    // Create a default Metadata instance
    let meta = Metadata::default_instance();

    // Attempt to parse the input data using the descriptor function
    // Handle errors gracefully using unwrap_or_default to ensure the fuzzer continues
    let _ = loader::load_metadata(&mut reader, &meta, data).unwrap_or_default();
});