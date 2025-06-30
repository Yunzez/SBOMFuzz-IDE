pub fn parse_tokens(input: &str) -> Vec<&str> {
    let mut tokens = Vec::new();
    let bytes = input.as_bytes();
    let len = bytes.len();

    let mut start = 0;
    let mut i = 0;

    while i < len {
        if bytes[i] == b' ' {
            if start < i {
                // SAFETY: We ensure start and i are valid UTF-8 boundaries
                let token = unsafe { std::str::from_utf8_unchecked(&bytes[start..i]) };
                tokens.push(token);
            }
            i += 1;
            start = i;
        } else {
            i += 1;
        }
    }

    if start < len {
        let token = unsafe { std::str::from_utf8_unchecked(&bytes[start..len]) };
        tokens.push(token);
    }

    tokens
}
