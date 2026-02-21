#![no_main]

use libfuzzer_sys::fuzz_target;

// Assuming the `power` function is publicly accessible from `program_a::arithmetic`.
use program_a::arithmetic::power;

// Define the fuzz target for the `power` function.
fuzz_target!(|data: (i32, u32)| {
    // The `power` function is called with a tuple of (i32, u32) as input.
    // This simulates a base and an exponent for the power calculation.
    let (base, exponent) = data;
    
    // Call the `power` function with the fuzzed inputs.
    let _ = power(base, exponent);
});