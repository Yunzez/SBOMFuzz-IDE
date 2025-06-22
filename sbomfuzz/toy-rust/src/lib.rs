use rand::Rng;

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

/// Some test doc comments.
/// To test jumping to function definition.
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn add_random(a: i32) -> i32 {
    let mut rng = rand::thread_rng();
    let random_number: i32 = rng.gen_range(1..=10);
    a + random_number
}

fn subtract(a: i32, b: i32) -> i32 {
    a - b
}

fn multiply(a: i32, b: i32) -> i32 {
    a * b
}

// ! this divide has a bug that can cause a panic
// ! -i32::MIN = +2_147_483_648 → which does not fit in an i32
pub fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("Cannot divide by zero");
    }
    a / b
}
