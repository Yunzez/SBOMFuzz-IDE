#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::subtract;

fuzz_target!(|data: (i32, i32)| {
    // Fuzzing the subtract function with two i32 inputs
    let (a, b) = data;
    let _ = subtract(a, b);
});