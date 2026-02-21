#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::multiply;

// Fuzzing harness for the `multiply` function
fuzz_target!(|data: (i32, i32)| {
    // Directly use the tuple data as input to the multiply function
    let (a, b) = data;
    let _ = multiply(a, b);
});