#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::modulo;

fuzz_target!(|data: (i32, i32)| {
    // Ensure the divisor is not zero to avoid division by zero panic.
    let (numerator, divisor) = data;
    if divisor != 0 {
        let _ = modulo(numerator, divisor);
    }
});