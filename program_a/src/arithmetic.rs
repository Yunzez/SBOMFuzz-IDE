/// Returns the sum of two integers.
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Returns the difference of two integers.
pub fn subtract(a: i32, b: i32) -> i32 {
    a - b
}

/// Multiplies two integers.
pub fn multiply(a: i32, b: i32) -> i32 {
    a * b
}

/// Divides `a` by `b`, returns `None` if `b` is zero to avoid panic.
pub fn divide(a: i32, b: i32) -> Option<i32> {
    if b == 0 { None } else { Some(a / b) }
}

/// Computes the modulus (remainder). Panics if `b` is zero.
pub fn modulo(a: i32, b: i32) -> Option<i32> {
    if b == 0 { None } else { Some(a % b) }
}

/// Computes exponentiation (a^b) with overflow risk.
pub fn power(mut a: i32, mut b: u32) -> i32 {
    let mut result: i32 = 1;
    while b > 0 {
        if b % 2 == 1 {
            result = result.wrapping_mul(a); // overflow-prone
        }
        a = a.wrapping_mul(a);
        b /= 2;
    }
    result
}

/// Computes square using raw pointer input.
pub fn square_ptr(input: *const i32) -> i32 {
    unsafe { *input * *input }
}

/// Uses `square_ptr` and combines result with a normal arithmetic operation.
pub fn compute_with_ptr(val: i32) -> i32 {
    let ptr = &val as *const i32;
    let square = square_ptr(ptr);  // unsafe call
    add(square, 10)  // reuses another internal function
}

/// Performs a full arithmetic workflow: parse input, compute expression, return result.
pub fn compute_expression(a: i32, b: i32) -> Option<i32> {
    let sum = add(a, b);
    let diff = subtract(a, b);
    let product = multiply(sum, diff);
    let powered = power(product, 2); // square it using power()
    divide(powered, 2) 
}
