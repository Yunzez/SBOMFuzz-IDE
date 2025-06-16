fn main() {
    println!("Hello, world!");
    let a = 10;
    let b = 5;
    let sum = add(a, b);
    let difference = subtract(a, b);
    let product = multiply(a, b);
    let quotient = divide(a, b);
    println!("Sum: {}", sum);
    println!("Difference: {}", difference);
    println!("Product: {}", product);
    println!("Quotient: {}", quotient);
}


fn add(a: i32, b: i32) -> i32 {
    a + b
}
fn subtract(a: i32, b: i32) -> i32 {
    a - b
}
fn multiply(a: i32, b: i32) -> i32 {
    a * b
}
fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("Cannot divide by zero");
    }
    a / b
}
