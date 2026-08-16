#![no_main]

use libfuzzer_sys::fuzz_target;
use phonenumber::{country, metadata};
use phonenumber::formatter;
fn has_first_group(format: &str) -> bool {
    for d in 1..=9 {
        if format.contains(&format!("${}", d)) {
            return true;
        }
    }
    false
}

fuzz_target!(|data: &[u8]| {
    if data.len() < 4 {
        return;
    }

    let regions = [
        country::Id::US,
        country::Id::GB,
        country::Id::DE,
        country::Id::FR,
        country::Id::CN,
        country::Id::IN,
        country::Id::JP,
        country::Id::AU,
        country::Id::BR,
        country::Id::CA,
        country::Id::RU,
        country::Id::SE,
        country::Id::NL,
        country::Id::ES,
        country::Id::IT,
        country::Id::ZA,
        country::Id::NG,
        country::Id::MX,
    ];

    let region_idx = (data[0] as usize) % regions.len();
    let meta = match metadata::DATABASE.by_id(regions[region_idx].as_ref()) {
        Some(meta) => meta,
        None => return,
    };

    let formats = meta.formats();
    if formats.is_empty() {
        return;
    }
    let format_idx = (data[1] as usize) % formats.len();
    let fmt = &formats[format_idx];

    let mode = data[2] % 3;
    let s = String::from_utf8_lossy(&data[3..]);
    let mid = s.len() / 2;
    let (national, carrier_str) = s.split_at(mid);

    let mut transform = None;
    let mut carrier = None;
    if has_first_group(fmt.format()) {
        match mode {
            1 => transform = fmt.national_prefix(),
            2 => {
                transform = fmt.domestic_carrier();
                if transform.is_some() && !carrier_str.is_empty() {
                    carrier = Some(carrier_str);
                }
            }
            _ => {}
        }
    }

    let _ = formatter::replace(national, meta, fmt, transform, carrier);
});
