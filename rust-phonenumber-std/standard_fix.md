# RFC3966 Parser Panic: `index out of bounds` at rfc3966.rs:47

## What happened
The panic comes from this line in `rust-phonenumber-std/src/parser/rfc3966.rs`:

```rust
.map(|&s| if s.as_bytes()[0] == b'+' { &s[1..] } else { s })
```

When the fuzzer produces a `phone-context` parameter with an empty value (e.g., `;phone-context=`), `s` is `""`. Indexing `s.as_bytes()[0]` on an empty string triggers `index out of bounds: the len is 0 but the index is 0`.

In short: the parser allows empty parameter values, but the prefix logic assumes the value has at least one byte.

## Fix options (choose one)

### Option A: Guard against empty string before indexing
Use a safe check instead of raw indexing:

```rust
.map(|&s| {
    if s.as_bytes().first() == Some(&b'+') {
        &s[1..]
    } else {
        s
    }
})
```

### Option B: Use `strip_prefix` and avoid byte indexing
This is cleaner and avoids manual bounds checks:

```rust
.map(|&s| s.strip_prefix('+').unwrap_or(s))
```

### Option C: Reject empty parameter values in the parser
If empty values should be invalid, change the parser to enforce at least one character:

```rust
let value = take_while1(pchar); // instead of take_while(pchar)
```

This prevents `phone-context` from ever being empty, but may be too strict if empty values are allowed by the spec or expected input.

### Option D: Treat empty `phone-context` as missing
If empty values are acceptable but should be ignored:

```rust
.and_then(|m| m.get("phone-context"))
.filter(|s| !s.is_empty())
.map(|&s| s.strip_prefix('+').unwrap_or(s))
```

## Recommendation
Option B is the smallest and safest change. If you want stricter parsing semantics, combine Option B with Option C or D depending on expected behavior.
