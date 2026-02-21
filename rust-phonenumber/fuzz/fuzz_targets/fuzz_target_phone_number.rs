#![no_main]

use libfuzzer_sys::fuzz_target; // Importing the fuzz target macro from libfuzzer-sys
use phonenumber::parser::phone_number; // Importing the function to be fuzzed

fuzz_target!(|data: &str| {
    // Attempt to parse the input string as a phone number.
    // The function returns an IResult, which we do not need to unwrap or handle further for fuzzing purposes.
    let _ = phone_number(data);
});