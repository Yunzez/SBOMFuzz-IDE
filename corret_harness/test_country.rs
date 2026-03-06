#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::{country, parser};

fuzz_target!(|data: (&[u8], country::Id)| {
    // fuzzed code goes here
    let s = String::from_utf8_lossy(data.0);
    let _ = parser::parse(Some(data.1), s);
});
