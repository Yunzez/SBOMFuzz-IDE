#![no_main]

use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: (i32, i32)| {
    let (a, b) = data;
    let _ = program_a::arithmetic::add(a, b);
});