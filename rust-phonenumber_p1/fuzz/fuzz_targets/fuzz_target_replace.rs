#![no_main]
use libfuzzer_sys::fuzz_target;
use phonenumber::{replace, Metadata, Format};
use arbitrary::Arbitrary;

// Define the fuzz target for the `replace` function
fuzz_target!(|data: ReplaceFuzzInput| {
    // Use the fuzzing input to call the `replace` function
    let _ = replace(
        &data.national,
        &data.meta,
        &data.formatter,
        data.transform.as_deref(),
        data.carrier.as_deref(),
    );
});

// Define a struct to represent the fuzzing input for the `replace` function
#[derive(Arbitrary, Debug)]
struct ReplaceFuzzInput {
    national: String,
    meta: Metadata,
    formatter: Format,
    transform: Option<String>,
    carrier: Option<String>,
}