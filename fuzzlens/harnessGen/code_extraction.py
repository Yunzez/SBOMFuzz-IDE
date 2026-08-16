import os
import re

def extract_rust_files(markdown_text):
    """
    Extracts Rust code blocks from AI-generated fuzzing harnesses, ensuring correct file separation.

    :param markdown_text: AI-generated markdown text containing multiple Rust code blocks.
    :return: A dictionary {function_name: rust_code}.
    """
    rust_files = {}

    # Fix malformed separators (handle both "***** FILE: ..." and "*****\nFILE: ...")
    markdown_text = re.sub(r"\*{5}\s*\n?FILE:", "***** FILE:", markdown_text)

    # Match file separators: "***** FILE: function_name.rs *****"
    file_blocks = re.split(r"\*{5} FILE:\s*(.*?)\s*\*{5}", markdown_text)[1:]

    for i in range(0, len(file_blocks), 2):
        function_name = file_blocks[i].strip()
        rust_code = file_blocks[i + 1].strip()

        # Handle cases where code blocks include or omit ```rust
        rust_code = re.sub(r"^```rust\s*", "", rust_code, flags=re.MULTILINE)  # Remove opening ```rust
        rust_code = re.sub(r"\s*```$", "", rust_code, flags=re.MULTILINE)  # Remove closing ```

        rust_files[function_name] = rust_code

    return rust_files


def save_markdown(crate_name, markdown_text, output_dir="generated_fuzz_harnesses"):
    """
    Saves the entire markdown text into a single .md file inside the crate's folder.

    :param crate_name: The name of the crate.
    :param markdown_text: The markdown content containing all fuzzing harnesses.
    :param output_dir: The base directory where the markdown file will be saved.
    """
    crate_dir = os.path.join(output_dir, crate_name)
    os.makedirs(crate_dir, exist_ok=True)  # Ensure crate-specific folder exists
    
    file_path = os.path.join(crate_dir, f"{crate_name}_fuzz_harnesses.md")
    with open(file_path, "w", encoding="utf-8") as md_file:
        md_file.write(markdown_text)
    
    print(f"📄 Markdown file saved: {file_path}")


def write_rust_files(output_dict, output_dir="generated_fuzz_harnesses"):
    """
    Writes extracted Rust code to separate `.rs` files based on crate and function names.

    :param output_dict: Dictionary where keys are crate names, values are markdown strings.
    :param output_dir: Directory to store generated Rust files.
    """
    os.makedirs(output_dir, exist_ok=True)  # Ensure base directory exists

    for crate_name, markdown_chunks in output_dict.items():
        # Join batched markdown into one string
        if isinstance(markdown_chunks, list):
            markdown_text = "\n\n".join(chunk for _, chunk in markdown_chunks)
        else:
            markdown_text = markdown_chunks
        save_markdown(crate_name, markdown_text, output_dir)

        crate_dir = os.path.join(output_dir, crate_name)  
        os.makedirs(crate_dir, exist_ok=True)  # Create crate-specific folder
        
        rust_files = extract_rust_files(markdown_text)

        for function_name, rust_code in rust_files.items():
            file_path = os.path.join(crate_dir, function_name)
            
            with open(file_path, "w", encoding="utf-8") as rust_file:
                rust_file.write(rust_code)
            
            print(f"✅ Rust fuzzing harness saved: {file_path}")

