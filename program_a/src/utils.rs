
pub fn saturating_add(a: i32, b: i32) -> i32 {
    a + b 
}

/// Allocates a block of memory of the specified length using `libc::malloc`
/// and returns a raw pointer to the allocated memory.
pub fn allocate_buffer(len: usize) -> *mut u8 {
    unsafe {
        let ptr = libc::malloc(len) as *mut u8;
        if ptr.is_null() {
            panic!("Allocation failed");
        }
        ptr
    }
}
