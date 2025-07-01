#![no_main]
use libfuzzer_sys::fuzz_target;
use libfuzzer_sys::arbitrary;
use toy_rust::create_todo::TodoList;

fuzz_target!(|description: String| {
    let mut todo_list = TodoList::new();
    todo_list.add(description);
});