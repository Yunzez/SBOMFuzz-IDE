# Study Readme: rust-phonenumber-std

## Purpose of This Crate
`rust-phonenumber` is a Rust library for parsing and working with phone numbers. It turns user-provided strings into structured data (e.g., national number, country code, and extension), using multiple parsing strategies.

## What It Does (High Level)
The crate exposes parsers that:
- Accept phone number strings in different formats.
- Extract components like national number, country prefix, and extension.
- Validate basic formatting rules and separators.

## Module Explanation
This crate is small and organized around parsing and data representation:
- `src/parser/`
  - Parsing implementations and helpers.
- `src/phone_number.rs`
  - Core data structures and formatting helpers for phone numbers.
- `src/country.rs`
  - Country metadata and utilities.
- `src/error.rs`
  - Error types used across the crate.
- `src/formatter.rs`
  - Formatting and normalization helpers for converting parsed data into canonical forms.
- `src/validator.rs`
  - Validation logic used to check whether parsed values are plausible or valid.
- `src/metadata/`
  - Metadata tables and loaders used by the parser/validator (e.g., region rules, patterns).
- `src/metadata/loader.rs`
  - Entry points for loading and looking up metadata records.

The parser layer:
- `src/parser/mod.rs`: main parser entry points and routing logic that wires format-specific parsers into higher-level parse functions. Example inputs can include both structured and unstructured phone strings routed to the appropriate parser.
- `src/parser/rfc3966.rs`: parser for RFC3966-style inputs with parameters. Example inputs: `tel:+1-201-555-0123`, `tel:201-555-0123;phone-context=+1`, `tel:+44-20-7946-0018;ext=123`.
- `src/parser/natural.rs`: parser for more permissive, user-entered inputs. Example inputs: `+1 (201) 555-0123`, `201-555-0123`, `020 7946 0018`.
- `src/parser/helper.rs`: shared parsing utilities, helper types, and predicate functions used across multiple parsers to keep logic consistent.

## Macro
- `macro_rules! parse` in `src/parser/helper.rs` defines a local Rust macro named `parse!`. It is a shortcut that makes repeated parsing steps easier to write. In this crate, it helps parser functions consume parts of the user input, such as stripping `tel:` before reading the phone number.

## Functions List
To help you get started, we have selected a few functions that cover the main parsing paths and validation checks.
They include higher-level entry points as well as format-specific parsers. You can choose from the follow functions to begin with. 

- `phonenumber::parser::parse_with (parser/mod.rs)`
- `phonenumber::parser::parse (parser/mod.rs)`
- `phonenumber::parser::valid::phone_number (parser/valid.rs)`
- `phonenumber::parser::natural::phone_number (parser/natural.rs)`
- `phonenumber::parser::rfc3966::phone_number (parser/rfc3966.rs)`
- `phonenumber::is_viable (parser/validator.rs)`
- `phonenumber::is_valid (parser/validator.rs)`
