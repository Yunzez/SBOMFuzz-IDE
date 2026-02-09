#![no_main]
use libfuzzer_sys::fuzz_target;
use arbitrary::{Arbitrary, Unstructured};

// Assuming fill_and_sum is a function that takes a slice of integers and returns a sum.
fn fill_and_sum(data: &[i32]) -> i32 {
    data.iter().sum()
}

fuzz_target!(|data: &[u8]| {
    if let Ok(slice) = Vec::<i32>::arbitrary(&mut Unstructured::new(data)) {
        // Call the function with the fuzzed data
        let _ = fill_and_sum(&slice);
    }
});