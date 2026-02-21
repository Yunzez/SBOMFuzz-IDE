#![no_main]
use libfuzzer_sys::fuzz_target;
use phonenumber::metadata::loader::descriptor;
use phonenumber::metadata::Metadata;
use std::io::Cursor;
use quick_xml::Reader;
use arbitrary::Arbitrary;

#[derive(Arbitrary, Debug)]
struct FuzzInput {
    name: Vec<u8>,
    data: Vec<u8>,
}

fuzz_target!(|input: FuzzInput| {
    let mut reader = Reader::from_reader(Cursor::new(input.data));
    let metadata = Metadata::default(); // Assuming a default implementation exists
    let _ = descriptor(&mut reader, &metadata, &input.name);
});