# Study Readme: rust-phonenumber-std

## Purpose of This Crate
`rust-phonenumber` is a Rust library for parsing and working with phone numbers. It turns user-provided strings into structured data (e.g., national number, country code, and extension), using multiple parsing strategies.

## What It Does (High Level)
The crate exposes parsers that:
- Accept phone number strings in different formats.
- Extract components like national number, country prefix, and extension.
- Validate basic formatting rules and separators.

The parsing pipeline relies on `nom` combinators and helper routines shared across parsers.

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

The parser layer:
- `src/parser/mod.rs`: main parser entry points and routing logic that wires format-specific parsers into higher-level parse functions. Example inputs can include both structured and unstructured phone strings routed to the appropriate parser.
- `src/parser/rfc3966.rs`: parser for RFC3966-style inputs with parameters. Example inputs: `tel:+1-201-555-0123`, `tel:201-555-0123;phone-context=+1`, `tel:+44-20-7946-0018;ext=123`.
- `src/parser/natural.rs`: parser for more permissive, user-entered inputs. Example inputs: `+1 (201) 555-0123`, `201-555-0123`, `020 7946 0018`.
- `src/parser/helper.rs`: shared parsing utilities, helper types, and predicate functions used across multiple parsers to keep logic consistent.
