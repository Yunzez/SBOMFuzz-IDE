#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::add;

fuzz_target!(|data: (i32, i32)| {
    // The `add` function is tested with random pairs of i32 integers.
    let (a, b) = data;
    let _ = add(a, b);
});