#![no_main]

// Import necessary crates and modules for fuzzing
use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::square_ptr;

// Define the fuzz target for the `square_ptr` function
fuzz_target!(|data: &[u8]| {
    // Convert the input data to a pointer to an integer if possible
    if let Some(&value) = data.get(0) {
        // Call the function with a pointer to the integer
        let ptr = &value as *const u8 as *const i32;
        // Safety: Ensure the pointer is valid and points to a valid integer
        unsafe {
            square_ptr(ptr);
        }
    }
});