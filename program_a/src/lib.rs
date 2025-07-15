pub mod arithmetic;
pub mod parser;
pub mod utils;
pub mod expr_eval;

use crate::arithmetic::*;
use crate::parser::{ parse_int };
use crate::utils::{ allocate_buffer, saturating_add };
pub fn demo() {
    let a = 1;
    let b = 2;
    let _ = add(a, b);
    let _ = subtract(a, b);
    let _ = multiply(a, b);
    let _ = divide(10, 2);
    let _ = modulo(10, 3);
    let _ = power(2, 3);
    let _ = parse_int("42");
    let _ = saturating_add(100, 100);
    let _ = parser::parse_and_sum("1,2,3");
    let _ = parser::parse_bool_or_int("true");
    let input = 5;
    let square = square_ptr(&input as *const i32);
    println!("Square of {} is {}", input, square);

    unsafe {
        let ptr = allocate_buffer(32);
        println!("Buffer allocated at: {:?}", ptr);
        libc::free(ptr as *mut _); // optional cleanup
    }

    let _ = compute_with_ptr(5);
    let _ = fill_and_sum(10, 5);
    let result = compute_expression(10, 5);
    match result {
        Some(value) => println!("Computed expression result: {}", value),
        None => println!("Error in computing expression"),
    }
}

// Allocates a buffer, fills it with a specified value, calculates the sum of its elements, and then frees the allocated memory.
pub fn fill_and_sum(len: usize, value: u8) -> u32 {
    unsafe {
        let ptr = allocate_buffer(len);
        for i in 0..len {
            *ptr.add(i) = value;
        }

        let mut sum = 0u32;
        for i in 0..len {
            sum += *ptr.add(i) as u32;
        }
        // Free the allocated memory
        libc::free(ptr as *mut _);

        sum
    }
}

#[cfg(test)]
mod tests {
    use crate::arithmetic::divide;
    use crate::parser::parse_hex;
    #[test]
    fn test_divide() {
        assert_eq!(divide(10, 2), Some(5));
    }

    #[test]
    fn test_parse() {
        assert_eq!(parse_hex("123"), Ok(123));
    }
}
