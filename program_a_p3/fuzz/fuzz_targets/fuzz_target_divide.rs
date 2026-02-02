#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::divide;

fuzz_target!(|data: (i32, i32)| {
    // Avoid division by zero by ensuring the divisor is not zero.
    let (numerator, denominator) = data;
    let _ = divide(numerator, denominator);
});