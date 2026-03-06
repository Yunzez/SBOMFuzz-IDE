#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::{country, metadata::DATABASE, parser};

fuzz_target!(|data: &[u8]| {
    // Early reject to keep inputs minimally meaningful
    if data.is_empty() {
        return;
    }

    if let Ok(s) = core::str::from_utf8(data) {
        // Deterministic choice to keep behavior stable
        let country_opt = if data[0] & 1 == 0 {
            Some(country::Id::US)
        } else {
            None
        };

        let _ = parser::parse_with(&DATABASE, country_opt, s);
    }
});