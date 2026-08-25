# Interview Protocol

**Note: The following questions and messages represent the general structure and content of the interview, but may not be asked verbatim. The phrasing or order may be adjusted to fit the flow of the conversation or specific context.**

**If this protocol takes longer than 60 mins on average to finish during the pilot, we will remove or simplify some questions.**

---

## Opening Script

Hi, my name is \_\_\_. Thank you for taking the time to participate in our usability study.

Our research focuses on understanding how software developers interact with automated fuzzing tools that are integrated into modern development environments. If you are unfamiliar with fuzzing, that's okay, we will introduce fuzzing in a bit.

In this study, you'll begin with a brief introduction to fuzzing. Then, you'll use a prototype fuzzing extension for Visual Studio Code to perform testing on selected functions.

After the tasks, we'll do a short 15-minute interview to learn more about your experience.

Our goal is to identify usability challenges, workflow issues, and points of confusion. Your honest feedback — both positive and negative — will make future versions of fuzzing tools more intuitive and effective for developers like you.

We value your privacy, and your data will be stored securely and will only be accessible to the research team. We will not release any identifiable or sensitive information about you. If you're ever uncomfortable with a question, feel free to skip it.

This session will be audio- and screen-recorded to help us analyze how the tool is used. The recordings will be stored locally.

We'll also share a summary of our findings with you if you're interested.

Before we begin, do you have any questions about the study or the consent form you filled out?

*Ask to start recording.*

## Introduction to Fuzzing / IDE Tool — 5–10 mins

Before we dive into the tasks, I'll give a quick overview of fuzzing and how the tool works. We will first do a quick introduction in fuzzing, after which I will ask you a few questions about your comprehension of fuzzing. This is not an assessment of your reading, but rather to give you a clear understanding of fuzzing.

### What is Fuzzing

Now, please go read the introduction to fuzzing here:

**Scenario A / Scenario B:** participants read the study's fuzzing introduction (`intro_fuzzing.md`, in this directory).

After reading:

I'm going to ask just a few quick questions to check your understanding of fuzzing. This isn't a test, it's only to catch any early confusion so the rest of the session goes smoother.

1. In your own words, what is fuzzing trying to accomplish?
   - *Expected: find bugs or unexpected behavior automatically, explore edge cases.*
2. What do you think a harness does in the fuzzing workflow?
   - *Expected: connects raw fuzzing inputs to the target function, converts bytes into the right argument types, defines the entry point the fuzzer should call, wraps the function so the fuzzer can run it repeatedly.*
3. Can the fuzzer call any random function in your codebase on its own? Why or why not?
   - *Expected: no, it needs a harness to tell it what function to call; it only runs whatever the harness exposes.*

Scenario B only:

4. If the fuzzer provides a raw buffer of bytes but your function requires a struct, how should the harness do?
   - *Expected: the harness should manipulate the raw buffer to map or "carve" the bytes into the specific fields of the struct.*

### What Does This Tool Do?

Now let's move on to the tool. The tool you'll be using today is a prototype extension for Visual Studio Code. Its goal is to make fuzzing easier and more integrated into your existing workflow. I will now show you a video as an introduction to this tool and how to use it.

*[Link to tutorial video — omitted for anonymization.]*

A few more things to add:

- During the study, LLM usages are not allowed, you should try to solve the problems on your own.
- You are, however, free to use browser and search for anything you'd like, that includes rust grammar or library functions.
- Please use Chrome or Edge for this study, as Firefox might block the extension page.
- You are unlikely to use to fix, since the harness will mostly work.

Before we start, I will give you a link to the documentation of the outputs a fuzzer might output (reproduced in the "LibAFL UserStats — Quick Reference" section at the end of this document).

Given the workflow and the output types described in the manual, which indicators do you expect will be the best predictors of finding a bug? What would a **successful** output look like to you?

**Pause for question:**

Before we move on, do you have any questions about what we've covered so far?

---

# Sc A specific:

Target Project A: Simple Rust library (e.g., math-utils)

**Setup:**

Imagine that you've been given a small Rust utility crate for simple math operations written by an intern in the company to test this new extension on. The purpose of this session is to see how well the tool helps you understand what to do, how to do it, and what the results mean.

We also ask that you think out loud as you go — this means saying what you're trying to do, what you're noticing, and anything that feels confusing or surprising.

This helps us understand not just what you do, but how you're thinking and making decisions while using the tool.

Now you can open up an incognito tab and we will give you a link to the study.

**Provide the link to the study here.**

## Tasks (Think-Aloud) — 40 mins

**Task A0: Orient to the Code (~5 min)**

Let's start by opening the project and just taking a minute to look around. You can explore all the files in the **src folder** to get a sense of what it does. As you do, think out loud — tell me what you're noticing or wondering. As you go, think about the following two questions:

- What kind of functionality do you see?
- If you were trying to find bugs, what kind of bugs would you be concerned about, and where would you look first?

**Task A1: Use the Tool to Identify a Function**

Now imagine you have to pick one function to start with in this system, use the extension, either the ranking on extension or your own intuition to browse or filter functions and pick one that you think could be a good fuzzing candidate.

- Why do you think this is a good fuzzing candidate?

**Task A2: Generate a Harness for the Function**

Now can you try generating a harness for that function using the extension?

**Important:** (After generation) Looking at the newly generated harness, what makes sense right away? Did anything confuse you?

**Task A3: Run Fuzzing and Observe UI Feedback**

Now try running the harness.

- (If the tool failed to work): I saw the harness didn't compile/run right away.
  - Can you read the stacktrace carefully and see what information you can gain from it? What do you think went wrong here? (Hypothesis)
  - Can you walk me through what you tried to fix?
  - What was the most frustrating or confusing part?
- (If the tool worked smoothly): The harness seemed to compile and run without issues. Was that what you expected?

Now, use the tool to run a campaign and observe the output.

- What interests you the most?
- Did you learn anything from the output, and what's unclear? What stats among all these would you put your focus on? Why?
- Do you think the harness is running effectively? Where did you learn that from?
- When do you think you should stop? What's your **stopping rule** right now?

**Task A4: Fix the code (if crashed):**

Now looking at the crash output stack trace, can you spot what was the issue that triggered this bug? Can you try to fix the issue, and rerun the harness again.

(If participant reruns harness again, repeat A3 → A4.)

**Task A5: Inspect a Provided Harness**

Now that you've seen how a harness looks and how fuzzing works, open the provided harness: `fuzz_target_parse_csv_ints`.

- Can you walk through what this harness is doing and how it handles inputs?
- Based on your understanding, do you think it will fuzz effectively? Why or why not?
- If you think it could be improved, describe what you would change.

**Task A6: Repeat the Harness Generation for One More Function**

Try generating a harness for another function. Did your strategy or trust in the tool change? Why?

## Post-Task Interview Questions — 10–15 mins

Now that you just had the first experience fuzzing in Rust with help of the extension to setup, we have some questions about how you feel and what you learned through this experience. Just a reminder, we did not implement this tool, we want your honest opinion on this tool and fuzzing in general.

**Interface and UI Interpretation (Scenario A only)**

- Did any parts of the UI mislead you or feel unnecessary?
  - Did anything about the layout or labels suggest a different meaning than what it actually did?
- What could the tool do to make the overall workflow clearer or more intuitive?
  - (If output): how do you want the output to be organized?
- What could the tool do differently to make the overall workflow clearer or more intuitive?
  - Did anything confuse you about which parts were important?
  - What other information should be included to guide you better in prioritizing function targets?

**Output & Prioritization**

- How would you want the fuzzing output to be organized to better support decision-making?
  - What should be emphasized first?
  - What could be hidden, collapsed, or deprioritized?
- What additional information, if any, would help you feel more confident when prioritizing functions?

**Pre vs. Post existing understanding**

- Before today, what did "fuzzing" mean to you, if anything?
- Was there anything about fuzzing that surprised you or contradicted your expectations?
- How do you think your understanding of fuzzing changed after this session?

**Learning process & tool scaffolding**

- While you were using the tool, were there any moments where something clicked, where you suddenly understood what fuzzing or harness generation actually does?
  - **Follow-up:** What helped that understanding (UI, code view, feedback messages, crash output, etc.)?
- Were there moments where you realized you didn't understand what was happening?
  - **Follow-up:** What would have helped you at that point?

**Mental model of harnesses and crashes**

- When you looked at a generated harness, what made it look "correct" or "trustworthy" to you?
  - **Follow-up:** (If crashes) Did you feel confident editing or debugging it yourself? Why or why not?
- (Optional) Were there parts of the harness you accepted without fully understanding?

**Possible adoption**

- After completing this session, do you think a fuzzing workflow like this fits into your development process?
  - **(If not)**: Why not? What do you think the workflow can change to better fit your development needs?
  - **Follow-up:** When in your workflow do you imagine using a tool like this, during feature dev, code review, testing, etc.?
  - **Follow-up:** What would make you feel more confident using fuzzing tools like this on your own projects?
- What questions would you be interested in to learn about fellow developers who also use this tool?
  - How would they integrate it in their workflow as well, how do they see the extension in terms of high level functionality?
  - What do they do to integrate it into the CI/CD pipeline?
  - How would they use it in a critical server, big company?

**Ending:**

Is there anything about your experience using the tool or learning fuzzing that we did not ask about but you think is important?

Are there questions you would want answered about how other developers approach or use fuzzing tools?

Thank you for participating in our study. That is all the questions we have.

Before we wrap up, we have one final step:
Please take a moment to complete a short 10-question survey called the **System Usability Scale**. It's a standard questionnaire used in usability research to help us evaluate how easy and intuitive the tool felt to use overall.

*[Link to System Usability Scale survey — omitted for anonymization.]*

---

# Scenario B

## Tasks (Think-Aloud) — 40 mins

**Setup:**

Imagine you are working as a security analyst on a development team. You've been assigned to assess the security of a small Rust library for parsing phone numbers that was recently written. The team suspects that there might be a few bugs or unexpected behaviors in the code. You may edit the code however you want.

Let's start by opening the project and go to the readme.md file, this file gives you more detail about what this crate is.

After reading that, you can take a few minutes to look around. You can explore the files and code to get a sense of what it does. As you do, think out loud, tell me what you're noticing or wondering.

**Task B0: Orient to the Code (~5 min)**

Let's start by opening the project and just taking a minute to look around. You can explore all the files in the **src folder** to get a sense of what it does. As you do, think out loud — tell me what you're noticing or wondering. As you go, think about the following two questions:

- What kind of functionality do you see?
- If you were trying to find bugs, what kind of bugs would you be concerned about, and where would you look first?

**Task B1: Use the Tool to Identify a Function**

Now imagine you have to pick one function to start with in this system, use the extension, either the ranking on extension or your own intuition to browse or filter functions and pick one that you think could be a good fuzzing candidate.

- Why do you think this is a good fuzzing candidate?

**Task B2: Generate a harness for the function you pick and analyze the harness.**

Review the generated harness. Does it make sense to you?

**If the harness broke:** Can you try to fix this harness?

- If they decided to stop, ask:
  - What makes you decide to give up?
  - What do you think can help you better fix this harness?

**If the harness builds:** please take a careful look at the harness:

- What is this harness doing to the fuzz input?
- What behavior, do you think, is reachable under this harness?
- Which parameters do you think matter to this function?
- Do you think this harness is good enough, there is no right or wrong answer?
  - If not: Make one change to broaden or clarify the input model, then rerun fuzzing and explain what changed.
  - If so: Why do you think so?

Before you run the harness, I will give you a link to the documentation of the outputs a fuzzer might output (reproduced in the "LibAFL UserStats — Quick Reference" section at the end of this document).

**Before they proceed:** Before we proceed, what do you think should happen if the harness is valid? What would you expect to see?

**Task B3: Run Fuzzing and Observe UI Feedback**

Now before you run the fuzzing campaign, obviously you haven't seen the output, but I'm curious about what are your expectations of the output, if any?

Now, use the tool to run a campaign and observe the output.

- What interests you the most?
- Did you learn anything from the output, and what's unclear? What stats among all these would you put your focus on? Why?
- Do you think the harness is running effectively? Where did you learn that from?
- When do you think you should stop? *Let them stop, do not dictate.*
- If there is more time, would you still consider fuzzing this?

**Task B4.1: What do you think of the coverage?**

**If not growing:**

Looking back at the harness, is there anything we can do to make the harness cover more code?

**If previous func did not crash:**

**Task B4.2: Try generate another harness for x function (buggy)**

According to another user of this crate, we have heard that there is a small issue with one of the parsers, they mentioned that sometimes issues may happen if they try to parse a phone number using **rfc3966**, can you try to fuzz out the issue?

**Task B5: Run Fuzzing and Observe UI Feedback**

Now, use the tool to run a campaign and observe the output once again.

**If previous func did crash, jump here:**

**Task B6: Stacktrace comprehension**

Seems like the program crashed! What do you think caused this crash?

Can you go through the stacktrace and tell me how you would find the location where the crash happened?

**Task B7: Fix the bug**

Nice, you have identified the issue, as a security analyst, how would you recommend the developer to patch this bug? Can you try to fix it?

**Task B8: After fixing the bug**

How confident are you with this fix? How would you verify that the bug is fixed? Do you think this harness can reveal more bugs?

## Post-Task Interview — 10–15 mins

Now that you just had the first experience fuzzing in Rust with help of the extension to setup, we have some questions about how you feel and what you learned through this experience. Just a reminder, we did not implement this tool, we want your honest opinion on this tool and fuzzing in general.

**Interface and UI Interpretation**

- Did any parts of the UI mislead you or feel unnecessary?
  - Did anything about the layout or labels suggest a different meaning than what it actually did?
- What could the tool do differently to make the overall workflow clearer or more intuitive?
- What other information can the extension provide during the setup process that can increase your confidence in finishing the tasks?

**Pre vs. Post existing understanding**

- Before today, what did "fuzzing" mean to you, if anything?
- How does the tool change your workflow? How would you imagine yourself fuzzing in real life?
- Was there anything about fuzzing that surprised you or contradicted your expectations?
- Would you trust a fully automated fuzzing system? Meaning that all the harness construction, crash finding, and triaging is done by the AI, instead of just the setup and harness part?
- If you have another crate to test with this extension, what would be your approach, now that you have some fuzzing experience?

**Output & Prioritization**

- How would you want the fuzzing output to be organized to better support decision-making?
  - What should be emphasized first?
  - What could be hidden, collapsed, or deprioritized?
- What additional information, if any, would help you feel more confident when prioritizing functions?

**Mental model of harnesses and crashes**

- When you looked at a generated harness, what made it look "correct" or "trustworthy" to you?
  - **Follow-up:** (If crashes) Did you feel confident editing or debugging it yourself? Why or why not?
- What do you consider to be a bug in a harness?
- When you see a crash like earlier, where do you think is the most promising place to find out why?
  - **Follow-up:** What's your step for triaging this issue?
- What else do you think the fuzzer could do to help you in the process of debugging?
- If you were to fix this bug yourself, what change would you make first?
- Do you think fuzzer helped you speed up your debugging process? How?

**Adoption:**

- After completing the session, do you think a fuzzing workflow fits into your software development cycle?
  - **(If not)**: Why not?
    - What can fuzzer do to squeeze in your research / work?
  - **Follow-up:** When in your workflow do you imagine using a tool like this, during feature dev, code review, testing, etc.?
  - **Follow-up:** What would make you feel more confident using fuzzing tools like this on your own projects?

# Ending

Thank you for walking through the fuzzing extension with us today. Your feedback on how the tool worked, what was clear or confusing, and how you approached each step is incredibly helpful. We're using this study to improve the design and usability of fuzzing tools so they better support developers like you.

