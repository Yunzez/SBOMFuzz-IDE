#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::metadata::loader::Reader;

fuzz_target!(|data: &[u8]| {
    if let Ok(id) = std::str::from_utf8(data) {
        let _ = Reader::by_id(id);
    }
});