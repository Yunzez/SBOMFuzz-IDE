#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::parser::rfc3966;
fuzz_target!(|data: &[u8]| {
    // fuzzed code goes here
    let _ = rfc3966::phone_number(".;phone-context=");
});
