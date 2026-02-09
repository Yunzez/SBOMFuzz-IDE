## Tasks (Think-Aloud) - 40 mins

### Task A0: Orient to the Code (~5 min)
Open the project and take a minute to look around. Explore the files in `src` to get a sense of what this crate does. Think out loud about what you notice or wonder. 

### Task A1: Use the Tool to Identify a Function
Pick one function to start with. Use the extension (ranking, search, or your intuition) to browse or filter functions and choose one you think is a good fuzzing target.

### Task A2: Generate a Harness for the Function
Use the extension to generate a harness for the function you selected.
- After generation, what makes sense right away?
- Did anything confuse you?

### Task A3: Run Fuzzing and Observe UI Feedback
Before running the campaign, describe what you expect to see in the output (if anything). Then run the harness.

Now run a fuzzing campaign and observe the output.

### Task A4: Fix the Code (if crashed)
If a crash occurred, look at the stack trace to identify the issue. Try to fix the bug and run the harness again.
- If you re-run the harness, repeat Task A3’s questions.

### Task A5: Inspect a Provided Harness
Now that you’ve seen how a harness looks and how fuzzing works, open the provided harness: `fuzz_target_parse_csv_ints`.
- Can you walk through what this harness is doing and how it handles inputs?
- Based on your understanding, do you think it will fuzz effectively? Why or why not?
- If you think it could be improved, describe what you would change.

### Task A6: Generate One More Harness
Generate a harness for another function.
- Did your strategy or trust in the tool change? Why?
