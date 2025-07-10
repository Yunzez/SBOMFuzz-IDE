/// Parses a comma-separated list of integers, e.g., "1,2,3"
pub fn parse_csv_ints(input: &str) -> Result<Vec<i32>, &'static str> {
    input
        .split(',')
        .map(|s| s.trim().parse::<i32>().map_err(|_| "parse error"))
        .collect()
}

///  Extracts the first number from a string (e.g., "abc123xyz" → 123)
pub fn extract_first_number(input: &str) -> Option<i32> {
    let mut num = String::new();
    for ch in input.chars() {
        if ch.is_ascii_digit() {
            num.push(ch);
        } else if !num.is_empty() {
            break;
        }
    }
    num.parse().ok()
}

/// Converts a hex string (e.g., "0xFF" or "FF") to an integer
pub fn parse_hex(input: &str) -> Result<u32, &'static str> {
    let cleaned = input.trim_start_matches("0x").trim();
    u32::from_str_radix(cleaned, 16).map_err(|_| "invalid hex")
}

/// Parses a string into an integer
pub fn parse_int(input: &str) -> Result<i32, &'static str> {
    input.trim().parse::<i32>().map_err(|_| "invalid integer")
}

/// Parses a boolean ("true"/"false", case insensitive)
pub fn parse_bool(input: &str) -> Result<bool, &'static str> {
    match input.trim().to_lowercase().as_str() {
        "true" => Ok(true),
        "false" => Ok(false),
        _ => Err("invalid boolean"),
    }
}


/// Parses a comma-separated list of integers and returns their sum.
pub fn parse_and_sum(input: &str) -> Result<i32, &'static str> {
    let values = parse_csv_ints(input)?;
    Ok(values.iter().sum())
}

/// Tries to parse a boolean first; if that fails, tries to parse an integer.
pub fn parse_bool_or_int(input: &str) -> Result<String, &'static str> {
    if let Ok(b) = parse_bool(input) {
        Ok(format!("bool: {}", b))
    } else if let Ok(i) = parse_int(input) {
        Ok(format!("int: {}", i))
    } else {
        Err("neither bool nor int")
    }
}