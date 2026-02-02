#![no_main]

// Import necessary crates and modules
use libfuzzer_sys::fuzz_target;
use program_a::arithmetic::divide;

// Define the fuzz target for the `divide` function
fuzz_target!(|data: (i32, i32)| {
    // Ensure the second parameter is not zero to avoid division by zero
    if data.1 != 0 {
        // Call the divide function with the fuzzed inputs
        let _ = divide(data.0, data.1);
    }
});