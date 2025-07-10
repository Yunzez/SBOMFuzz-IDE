use program_a::arithmetic::*;
use program_a::parser::*;

fn main() {

    let result = divide(10, 2);
    println!("10 / 2 = {:?}", result);

    let parsed = parse_hex("123");
    println!("Parsed: {:?}", parsed);

    let numbers = parse_csv_ints("1, 2, 3");
    println!("CSV Parsed: {:?}", numbers);

    let some_result = {
        let val = 5;
        square_ptr(&val)
    };
    println!("Square via ptr: {}", some_result);
}