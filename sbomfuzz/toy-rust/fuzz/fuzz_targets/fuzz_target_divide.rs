#![no_main]
use libfuzzer_sys::fuzz_target;
use toy_rust::divide;

fuzz_target!(|data: (i32, i32)| {
    let (a, b) = data;
    // Avoid division by zero
    if b != 0 {
        let _ = divide(a, b);
    }
});