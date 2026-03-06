#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::{country, parser};

fuzz_target!(|data: &[u8]| {
    let (tag, s_bytes) = match data.split_first() {
        Some((t, r)) => (*t, r),
        None => (0u8, &[][..]),
    };

    let country_opt = match tag % 13 {
        0 => None,
        1 => Some(country::Id::US),
        2 => Some(country::Id::GB),
        3 => Some(country::Id::DE),
        4 => Some(country::Id::FR),
        5 => Some(country::Id::RU),
        6 => Some(country::Id::CN),
        7 => Some(country::Id::JP),
        8 => Some(country::Id::IN),
        9 => Some(country::Id::BR),
        10 => Some(country::Id::ZA),
        11 => Some(country::Id::AU),
        _ => Some(country::Id::CA),
    };

    let s = std::str::from_utf8(s_bytes).unwrap_or_default();
    let _ = parser::parse(country_opt, s);
});