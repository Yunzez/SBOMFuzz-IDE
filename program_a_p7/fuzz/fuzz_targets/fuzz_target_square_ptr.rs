#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::square_ptr;

fuzz_target!(|data: &[u8]| {
    if data.len() >= std::mem::size_of::<i32>() {
        let mut num = i32::from_ne_bytes(data[0..4].try_into().unwrap_or_default());
        // Call the function with the fuzzed input
        square_ptr(&mut num);
    }
});