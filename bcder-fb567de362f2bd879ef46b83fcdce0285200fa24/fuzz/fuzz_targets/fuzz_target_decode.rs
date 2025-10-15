#![no_main]

use libfuzzer_sys::fuzz_target;
use bcder::{decode, Mode, OctetString};

fuzz_target!(|data: &[u8]| {
    // Attempt to decode using the provided source and operation
    let source = decode::Constructed::decode(data, Mode::Der);

    // Define an operation function as a placeholder
    let op = |cons: &mut decode::Constructed| {
        // Attempt to decode some data
        OctetString::decode(cons)
    };

    // Execute the decode operation
    if let Ok(mut cons) = source {
        let _ = op(&mut cons);
    }
});