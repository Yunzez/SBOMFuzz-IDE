#![no_main]
use {libfuzzer_sys::fuzz_target};
use program_a::arithmetic::power;
use arbitrary::{Arbitrary,Unstructured};

#[derive(Arbitrary, Debug)]
struct C{
    a:i32,
    b:u32
}

fuzz_target!(|c: C| {          
    let _ = power(c.a, c.b);                        
});
