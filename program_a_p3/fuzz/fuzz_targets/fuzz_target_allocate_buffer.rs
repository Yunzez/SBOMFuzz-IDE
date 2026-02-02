#![no_main]

use libfuzzer_sys::fuzz_target;
use program_a::utils::allocate_buffer;

fuzz_target!(|data: u8| {
    // Attempt to allocate a buffer with the provided data length.
    // The function is assumed to take a length parameter, inferred from typical usage.

    let my_usize: usize = data as usize;
    let _ = allocate_buffer(my_usize);
});