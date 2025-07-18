use std::collections::HashMap;

use rand::Rng;

#[derive(Debug, Clone)]
pub(crate) struct TodoItem {
    id: u32,
    description: String,
    done: bool,
}

#[derive(Debug)]
pub struct TodoList {
    todos: HashMap<u32, TodoItem>,
    archive: HashMap<u32, TodoItem>,
    next_id: u32,
}

impl TodoList {
    pub fn new() -> Self {
        TodoList {
            todos: HashMap::new(),
            archive: HashMap::new(),
            next_id: 1,
        }
    }

    pub fn add(&mut self, description: String) {
        let id = self.next_id;
        self.next_id += 1;
        let todo = TodoItem {
            id,
            description,
            done: false,
        };
        self.todos.insert(id, todo);
    }

    pub fn delete(&mut self, id: u32) {
        if let Some(todo) = self.todos.remove(&id) {
            self.archive.insert(id, todo);
        }
    }

    pub fn mark_done(&mut self, id: u32) {
        if let Some(todo) = self.todos.get_mut(&id) {
            todo.done = true;
        }
    }

    pub fn random_todo(&self) -> usize {
        let mut rng = rand::thread_rng();
        let random_index = rng.gen_range(0..self.todos.len());
        let todo_id = self.todos.keys().nth(random_index).unwrap();
        *todo_id as usize
    }

    pub fn sugguest_something(&self) -> String {
        let mut rng = rand::thread_rng();
        let random_index = rng.gen_range(0..self.todos.len());
        let todo_id = self.todos.keys().nth(random_index).unwrap();
        if let Some(todo) = self.todos.get(todo_id) {
            format!("Suggestion: {}", todo.description)
        } else {
            "No suggestions available".to_string()
        }
    }

    pub fn print(&self) {
        println!("Current Todos:");
        for todo in self.todos.values() {
            println!(
                "ID: {}, Description: {}, Done: {}",
                todo.id, todo.description, todo.done
            );
        }
        println!("\nArchived Todos:");
        for todo in self.archive.values() {
            println!(
                "ID: {}, Description: {}, Done: {}",
                todo.id, todo.description, todo.done
            );
        }
    }

    pub fn print_todo(&self) {
        println!("Todos Not Done:");
        for todo in self.todos.values() {
            if !todo.done {
                println!("ID: {}, Description: {}", todo.id, todo.description);
            }
        }
    }
}