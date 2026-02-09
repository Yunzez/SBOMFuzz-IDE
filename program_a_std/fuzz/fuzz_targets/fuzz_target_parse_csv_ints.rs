#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::parser::parse_csv_ints;

fuzz_target!(|data: &[u8]| {
    let input = String::from_utf8_lossy(data);
    // Normalize to a simple CSV of digits, dropping empty fields.
    let mut sanitized = String::with_capacity(input.len());
    for ch in input.chars() {
        if ch.is_ascii_digit() {
            sanitized.push(ch);
        } else if ch.is_whitespace() {
            break;
        } else {
            sanitized.push(',');
        }
    }
    let cleaned = sanitized
        .split(',')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(",");
    if cleaned.is_empty() {
        return;
    }
    let _ = parse_csv_ints(&input);
});
