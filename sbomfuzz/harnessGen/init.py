import argparse
import os

from dotenv import load_dotenv
from generation import generate_output
from code_extraction import write_rust_files
def process_info(path) -> dict:
    """
    Processes the content of a file at the given path and extracts function information.
    Args:
        path (str): The path to the file to be processed.
    Returns:
        dict: A dictionary where the keys are crate names and the values are lists of functions 
              associated with those crates. Each function is represented as a string.
    """
    all_function = []
    with open(path, 'r') as file:
        content = file.read()

    parts = content.split('*****')
    for i, part in enumerate(parts):
        if i > 0 and part != '':
            all_function.append(part.strip())
    
    ret = {}
    for function in all_function:
        lines = function.split('\n')
        for line in lines:
            print(line)
            if "- Crate:" in line:
                current_crate = line.split(":")[1].strip()
                if current_crate not in ret:
                    ret[current_crate] = [function]
                else: 
                    ret[current_crate].append(function)
                break
    return ret

def prepare_prompt(fuzzer_choice):
    print(f"Preparing to fuzz with {fuzzer_choice}...")
    with open('./prompt.txt', 'r') as prompt_file:
        prompt = prompt_file.read()
        prompt = prompt.replace("<fuzzer>", fuzzer_choice)
        return prompt 



def main(function_info_path, software_dir, fuzzer_choice):

    load_dotenv()
    # Validate function entry information file
    if not os.path.isfile(function_info_path):
        print(f"Error: Function entry information file '{function_info_path}' not found.")
        return

    # Validate software directory
    if not os.path.isdir(software_dir):
        print(f"Error: Software directory '{software_dir}' not found.")
        return

    # Validate fuzzer choice (placeholder, expand based on available fuzzers)
    supported_fuzzers = ["libfuzzer", "afl", "honggfuzz"]
    if fuzzer_choice.lower() not in supported_fuzzers:
        print(f"Error: Unsupported fuzzer '{fuzzer_choice}'. Choose from {supported_fuzzers}.")
        return

    print(f"Starting fuzzing with {fuzzer_choice} on {software_dir} using function info from {function_info_path}...")
    
    # TODO: Implement harness generation logic based on function entry information
    # TODO: Integrate with the chosen fuzzer
    # Retrieve API key from environment variable
    api_key = os.getenv("API_KEY")
    if not api_key:
        print("Error: API key not found in environment variables.")
        return

    # Use the API key for further processing (e.g., accessing a service)
    print(f"Using API key: {api_key}")
    info_list = process_info(function_info_path)
    # print(info_list)
    prompt = prepare_prompt(fuzzer_choice)
    print("prompt ready")
    output = generate_output(api_key, info_list, prompt)
    print("output ready")
    write_rust_files(output)
    # print(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fuzzing harness generator and executor.")
    parser.add_argument("function_info", type=str, help="Path to the function entry information file.")
    parser.add_argument("software_dir", type=str, help="Path to the directory of the software under test.")
    parser.add_argument("fuzzer", type=str, help="Preferred fuzzer (e.g., libfuzzer, afl, honggfuzz).")
    
    args = parser.parse_args()
    main(args.function_info, args.software_dir, args.fuzzer)

