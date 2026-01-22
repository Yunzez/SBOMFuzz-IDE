#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::parser::parse_csv_ints;

fuzz_target!(|data: &[u8]| {
    let input = String::from_utf8_lossy(data);

    let _ = parse_csv_ints(&input);
});
