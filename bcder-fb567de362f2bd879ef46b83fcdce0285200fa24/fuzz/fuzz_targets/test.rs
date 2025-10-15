#![no_main]

use libfuzzer_sys::fuzz_target;
use bcder::decode::SliceSource;
use bcder::int::Integer;
use bcder::{Mode, Tag};

fuzz_target!(|data: &[u8]| {
    // Test Integer::take_from with BER mode
    let _ = Mode::Ber.decode(SliceSource::new(data), |cons| {
        Integer::take_from(cons)
    });
    
    // Test Integer::take_from with DER mode  
    let _ = Mode::Der.decode(SliceSource::new(data), |cons| {
        Integer::take_from(cons)
    });
    
    // Test Integer::take_from with CER mode
    let _ = Mode::Cer.decode(SliceSource::new(data), |cons| {
        Integer::take_from(cons)
    });
    
    // Test multiple consecutive Integer::take_from calls
    let _ = Mode::Ber.decode(SliceSource::new(data), |cons| {
        let _first = Integer::take_from(cons)?;
        let _second = Integer::take_from(cons)?;
        Ok(())
    });
    
    // Test with limited source to check boundary conditions
    if !data.is_empty() {
        for i in 1..=data.len().min(10) {
            let _ = Mode::Ber.decode(SliceSource::new(&data[..i]), |cons| {
                Integer::take_from(cons)
            });
        }
    }
    
    // Test combining with other primitive operations
    let _ = Mode::Ber.decode(SliceSource::new(data), |cons| {
        let _int = Integer::take_from(cons)?;
        // Try to take another primitive after the integer
        cons.take_primitive_if(Tag::BOOLEAN, |prim| {
            prim.to_bool()
        }).ok(); // Ignore errors since we don't know what follows
        Ok(())
    });
});
