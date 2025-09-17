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
    let ok = (c.a % 7 == 0) && (c.b % 13 == 1); 
    let a = if ok { 1 } else { 2 };             
    let b = if ok { 3 } else { 4 };             
    let _ = power(a, b);                        
});
