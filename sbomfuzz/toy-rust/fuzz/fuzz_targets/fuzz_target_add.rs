#![no_main]

use libfuzzer_sys::fuzz_target;
use toy_rust::create_todo::TodoList;

fuzz_target!(|data: &[u8]| {
    if let Ok(data_str) = std::str::from_utf8(data) {
        let mut todo_list = TodoList::new();
        todo_list.add(data_str.to_string());
    }
});