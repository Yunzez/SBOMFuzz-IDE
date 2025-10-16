#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::parser::parse_with;
use phonenumber::country::Id;
use phonenumber::metadata::DATABASE;
use libfuzzer_sys::arbitrary::{Arbitrary, Unstructured};
use std::str::FromStr;

#[derive(Debug)]
struct FuzzInput {
    input: String,
    country_code: String,
}

impl<'a> Arbitrary<'a> for FuzzInput {
    fn arbitrary(u: &mut Unstructured<'a>) -> arbitrary::Result<Self> {
        let input = String::arbitrary(u)?;
        let country_code = String::arbitrary(u)?;
        Ok(FuzzInput { input, country_code })
    }
}

fuzz_target!(|data: FuzzInput| {
    let country_code = Id::from_str(&data.country_code).unwrap_or_default();
    let _ = parse_with(&DATABASE, &country_code, &data.input);
});