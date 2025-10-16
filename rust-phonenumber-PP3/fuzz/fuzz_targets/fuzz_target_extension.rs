#![no_main]
use libfuzzer_sys::fuzz_target;
use libfuzzer_sys::arbitrary;
use phonenumber::parse;
use phonenumber::Mode;
use phonenumber::PhoneNumber;

fuzz_target!(|data: &[u8]| {
    if let Ok(phone_number) = parse(None, std::str::from_utf8(data).unwrap_or("")) {
        let _ = phone_number.extension();
    }
});