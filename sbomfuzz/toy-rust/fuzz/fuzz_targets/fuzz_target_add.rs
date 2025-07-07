#![no_main]

use libfuzzer_sys::fuzz_target;
use toy_rust::create_todo::TodoList;

fuzz_target!(|data: &str| {
    let mut todo_list = TodoList::new();
    todo_list.add(data.to_string());
});