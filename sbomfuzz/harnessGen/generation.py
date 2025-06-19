import requests

def attach_function_info(prompt, function_info):
    concat = "\n\n".join(function_info)
    updated_prompt = prompt.replace("<function-info>", concat)
    # print(updated_prompt)
    return updated_prompt

def chunked(iterable, size):
    """Yield successive chunks of size from iterable."""
    for i in range(0, len(iterable), size):
        yield iterable[i:i + size]


def generate_output(apikey, info_list, prompt):
    """
    Generates output based on the provided API key and function information.

    :param apikey: The API key to be used for authentication.
    :param info_list: A dictionary where keys are crate names and values are lists of function information.
    :param prompt: The base prompt template.
    :return: A dictionary containing the generated output.
    """
    output = {}
    
    for crate_name, function_array in info_list.items():
        print(f"Processing crate: {crate_name}")
        crate_outputs = []

        # Split function info into chunks of 5
        for i, func_chunk in enumerate(chunked(function_array, 5), start=1):
            print(f"  Processing batch {i} (functions {len(func_chunk)})")

            updated_prompt = attach_function_info(prompt, func_chunk)

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {apikey}"
            }

            data = {
                "model": "gpt-4o",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a helpful assistant specialized in Rust fuzzing harness generation."
                    },
                    {
                        "role": "user",
                        "content": updated_prompt
                    }
                ]
            }

            response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data)

            if response.status_code == 200:
                result = response.json()
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "No response received.")
                crate_outputs.append((f"Batch {i}", content))
            else:
                crate_outputs.append((f"Batch {i}", f"Error: {response.status_code} - {response.text}"))

        output[crate_name] = crate_outputs
        
    return output
