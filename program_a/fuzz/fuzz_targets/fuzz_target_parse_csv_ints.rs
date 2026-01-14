#![no_main]
use libfuzzer_sys::fuzz_target;
use program_a::parser::parse_csv_ints;

fuzz_target!(|data: &[u8]| {
    let input = String::from_utf8_lossy(data);
    let mut sanitized = String::with_capacity(input.len());
    let mut last_comma = true;
    for ch in input.chars() {
        if ch.is_ascii_digit() || ch == ',' {
            if ch == ',' {
                if !last_comma {
                    sanitized.push(',');
                    last_comma = true;
                }
            } else {
                sanitized.push(ch);
                last_comma = false;
            }
        } else if ch.is_whitespace() {
            break;
        } else {
            if !last_comma {
                sanitized.push(',');
                last_comma = true;
            }
        }
    }
    if sanitized.ends_with(',') {
        sanitized.pop();
    }
    if sanitized.is_empty() {
        return;
    }
    let _ = parse_csv_ints(&sanitized);
});
