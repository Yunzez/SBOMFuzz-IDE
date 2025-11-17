#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::power;

fuzz_target!(|data: (i32, i32)| {
    let (a, b) = data;
    let _ = power(a, b);
});