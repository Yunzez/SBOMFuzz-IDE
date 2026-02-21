#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::arithmetic;

// Fuzz target for the `multiply` function from the `arithmetic` module.
fuzz_target!(|data: (i32, i32)| {
    // Call the `multiply` function with fuzzed inputs `a` and `b`.
    let _ = arithmetic::multiply(data.0, data.1);
});