#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::multiply;

fuzz_target!(|data: (i32, i32)| {
    // Fuzzing the multiply function with two i32 integers.
    let (a, b) = data;
    let _ = multiply(a, b);
});