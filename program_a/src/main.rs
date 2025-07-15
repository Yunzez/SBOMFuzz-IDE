use std::io::{self, Write};

use program_a::arithmetic::*;
use program_a::expr_eval::evaluate_expression;
use program_a::parser::*;


fn main() {
    println!("Type \"exit\" to exit");

    let stdin = io::stdin();
    let mut stdout = io::stdout();
    loop {
        print!("> ");
        let _ = stdout.flush();
        let mut input = String::new();
        match stdin.read_line(&mut input) {
            Ok(_) => (),
            Err(e) => {
                println!("Error reading from stdin: {e}");
                continue
            }
        }

        if input.trim() == "exit" {
            break
        }

        match evaluate_expression(&input) {
            Ok(result) => println!("{result}"),
            Err(e) => {
                println!("Error parsing input: {e}");
                continue
            }    
        }
    }
}


fn test_main() {
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

    let expr = "1 + 2 * 3";
    println!("Eval expression \"{expr}\" = {:?}", evaluate_expression(expr));

    let expr = "1 + (2 * 3)";
    println!("Eval expression \"{expr}\" = {:?}", evaluate_expression(expr));

    let expr = "(1 + 6) / (1 + 2)";
    println!("Eval expression \"{expr}\" = {:?}", evaluate_expression(expr));

    let expr = "1 + 2 ^ 3";
    println!("Eval expression \"{expr}\" = {:?}", evaluate_expression(expr));

    let expr = "(1 + (3 * 3)) % 12";
    println!("Eval expression \"{expr}\" = {:?}", evaluate_expression(expr));

    // Broken logic allows for invalid expressions like this
    let expr = "1 + 2 ^ 3)";
    println!("Eval expression \"{expr}\" = {:?}", evaluate_expression(expr));

    let expr = "1 + (2 * 3";
    println!("Eval expression \"{expr}\" = {:?}", evaluate_expression(expr));
}