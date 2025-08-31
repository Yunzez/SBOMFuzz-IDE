#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::subtract;

fuzz_target!(|data: (i32, i32)| {
    let (a, b) = data;
    // Fuzz the subtract function with two i32 integers
    let _ = subtract(a, b);
});