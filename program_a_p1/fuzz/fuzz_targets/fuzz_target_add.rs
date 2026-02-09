#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::add;

fuzz_target!(|data: (i32, i32)| {
    // The fuzzing target is the `add` function from the `arithmetic` module.
    // It takes two `i32` parameters.
    let (a, b) = data;
    let _ = add(a, b);
});