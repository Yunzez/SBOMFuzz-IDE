use toy_rust::{ add, divide, multiply, parser, subtract };
use toy_rust::create_todo::TodoList;

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
    let mut todo_list = TodoList::new();

    todo_list.add("Learn Rust".to_string());
    todo_list.add("Build a project".to_string());
    todo_list.add("Contribute to open source".to_string());

    todo_list.print_todo();

    println!("{}", todo_list.sugguest_something());

    todo_list.mark_done(1);
    todo_list.delete(2);

    todo_list.print();

    let input = "this is unsafe parsing";
    let tokens = parser::parse_tokens(input);
}
