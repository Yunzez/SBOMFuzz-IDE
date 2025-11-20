# Fuzzing Study Design TODO / Notes

This file summarizes design decisions for the SBOMFuzz IDE study, the concrete TODO list, and what kinds of findings we can expect if tasks are designed well.

## Design Principles

1. **Target persona is non‑expert developers**
   - We explicitly target developers with little or no prior fuzzing experience, using an IDE extension in a realistic workflow after a short “quickstart‑level” introduction.
   - Novice‑ness is a *feature*, not a flaw: prior work shows that starting fuzzing from scratch is hard; we study what barriers remain when we remove setup and add IDE support.

2. **Intro provides navigation knowledge, not expert knowledge**
   - Navigation knowledge = enough to avoid trivial confusion:
     - What fuzzing is, at a high level.
     - What a harness is, conceptually.
     - What a crash means.
     - What a few key metrics roughly represent.
   - Expert knowledge (what makes a “good” harness, detailed metric tuning, recommended stopping rules) is *not* taught up front, so participants’ mistakes remain informative.

3. **The intro is a deliberate part of the tool scenario**
   - In the real world, a developer who installs the extension would watch a short intro video or skim a quickstart.
   - The study mirrors that: a short fuzzing + tool intro (script/video), then tasks in the IDE.
   - This is documented and justified in the protocol, so reviewers see it as a conscious design choice.

4. **We do not teach manual harness creation**
   - The tool’s main value is removing the harness setup barrier; teaching participants how to write manual harnesses would muddle that.
   - We explain what a harness *is* and show the generated harness, but do not perform a “cargo‑fuzz from scratch” tutorial.

5. **We intentionally leave some libAFL details unexplained**
   - We briefly define only a few key metrics (e.g., execs, coverage, crashes).
   - We do *not* give a full legend of every output field or prescriptive stopping rules.
   - This lets us observe how developers interpret and (mis)use metrics and outputs on their own.

6. **Comprehension checks separate intro quality from mental models**
   - Immediately after the intro, participants answer a few short questions in their own words.
   - If they pass the check but still misinterpret metrics or make poor stopping decisions, we can argue the problems reflect mental models and UI, not just a bad explanation.

---

## Concrete TODOs

### A. Intro Materials (Fuzzing + Tool)

- [ ] **Create a short “fuzzing basics” script or video**
  - 3–5 minutes max, written script + optional screen recording.
  - Covers:
    - High‑level definition of fuzzing:
      - Automatically generates many inputs.
      - Runs a target repeatedly to find crashes/bugs.
    - Concept of a harness:
      - Tiny wrapper that converts fuzzer bytes into arguments.
      - Calls the target function on each input.
      - Our tool auto‑generates this harness.
    - What a crash means:
      - An input that makes the harnessed code panic/abort.
      - Still requires developer triage to decide if it is a real bug.
    - Minimal tool orientation:
      - Where to see suggested targets and generate/open harnesses.
      - How to run fuzzing from the IDE.
      - Where fuzzer output appears.

- [ ] **Add brief explanations of 2–3 key libAFL metrics**
  - In the intro (and/or an in‑tool tooltip / static legend), define:
    - `Execs`: number of inputs executed so far.
    - `Coverage`: rough indication of how much code has been exercised.
    - `Crashes`: number of distinct crashing inputs.
  - Avoid telling participants:
    - How many execs is “enough”.
    - What a “good” coverage value is.
    - Any specific stopping rule.

- [ ] **Decide what *not* to explain explicitly**
  - Do **not**:
    - Teach manual harness authoring patterns.
    - Walk through every libAFL field.
    - Give prescriptive stopping rules.
  - Optionally:
    - Provide a static legend or help panel in the tool with more detail that participants *can* consult, but do not read through in the intro.

### B. Comprehension Check

- [ ] **Add a short post‑intro comprehension check**
  - After the intro, ask a few open‑ended questions (written or oral), for example:
    - “In your own words, what does a fuzz harness do?”
    - “In your own words, what does the coverage number represent?”
    - “If the fuzzer reports a crash, what does that tell you?”
    - “Name one field in the fuzzer output you might pay attention to, and why.”
  - Record responses:
    - Code them later to see who understood the basics.
    - Use this to argue that later misunderstandings are not purely due to a missing intro.

### C. Protocol and Script Updates

- [ ] **Update the written protocol to include the new intro**
  - Add a section summarizing:
    - The purpose of the intro (simulate a realistic quickstart).
    - Approximate duration (e.g., 5 minutes).
    - Topics covered (as above).
    - The presence of the comprehension check.
  - Note that:
    - Participants may ask clarification questions.
    - The moderator may answer basic clarifications but will not coach on optimal fuzzing strategies.

- [ ] **Integrate think‑aloud prompts about metrics and stopping**
  - During tasks, prompt:
    - “As you watch the fuzzer output, tell me what you are paying attention to.”
  - In the interview, include questions like:
    - “How did you decide when to stop fuzzing?”
    - “Which fields in the fuzzer output felt important or confusing?”
    - “Did anything about the output lead you to change your strategy?”

- [ ] **Integrate prompts about harness understanding and trust**
  - During tasks and interviews, ask:
    - “What do you think this harness is doing?”
    - “If you changed this line in the harness, what would happen?”
    - “Did you trust that the generated harness was testing the right thing? Why or why not?”

- [ ] **Document what is intentionally *not* explained**
  - In the protocol and (later) the paper, explicitly note:
    - We do not teach manual harness creation in detail.
    - We do not give recommended stopping rules.
    - We do not thoroughly explain all libAFL metrics.
  - Rationale:
    - We want to observe how developers interpret the tool’s output unaided, after a realistic minimal intro.

### D. Implementation / Tool‑Side Options (Optional Enhancements)

These are optional but can strengthen the study and future tool iterations.

- [ ] **Add a simple in‑tool legend / help panel**
  - Brief text or tooltips for:
    - Execs, coverage, crashes.
    - A one‑sentence reminder of what a harness is.
  - Log whether participants open this panel (if possible).

- [ ] **Make the harness’s target and mapping more visible**
  - For example:
    - Show in the UI which function is being fuzzed and how parameters are mapped.
  - This can be studied as a design element for reducing harness opacity.

---

## What We Expect to Learn (If Tasks Are Designed Well)

Assuming IDE‑only condition (no manual baseline), and tasks that include: running fuzzing with an auto‑generated harness, fixing a “bad” harness, and triaging crashes, we can reasonably expect:

1. **Metric misinterpretation and miscalibrated stopping**
   - Phenomena already seen in pilot notes:
     - Participants using RSS/memory as a stopping rule because it is “the only thing changing”.
     - Confusion when coverage does not increase even after a fix.
   - With the new intro and comprehension check:
     - We can show that even participants who can explain coverage in simple terms still use weak or arbitrary stopping rules.
     - This supports claims about miscalibrated metrics and risky stopping behavior in fuzzing tools.

2. **Harness opacity and over‑trust in generated harnesses**
   - Participants may:
     - Struggle to articulate what exactly the harness is testing.
     - Rely heavily on comments and the tool card, without understanding the code.
     - Fail to detect subtle harness issues unless explicitly prompted.
   - This leads to design guidelines on:
     - Making harness structure and target clearer in the UI.
     - Using comments and explanations to support *accurate* trust, not blind trust.

3. **Confusion about crash identity and bug status**
   - After fixes, participants may:
     - Be unsure whether new crashes are the same bug resurfacing or new issues.
     - Feel confused when output keeps reporting crashes with similar messages.
   - This can motivate:
     - Better crash grouping / deduplication in the tool.
     - Clearer communication about whether a crash is “known” vs “new”.

4. **Gap between conceptual knowledge and effective use**
   - Some participants will:
     - Answer the comprehension check correctly.
     - Still:
       - Pick uninformative metrics as their main signal.
       - Stop fuzzing too early or too late.
       - Misinterpret output or ignore key information.
   - This gap is evidence that:
     - A minimal conceptual understanding is not enough.
     - Tool design and in‑context explanations strongly shape actual behavior.

5. **Concrete design guidelines for IDE‑integrated fuzzing tools**
   - From the observed breakdowns and strategies, we can derive:
     - Which metrics and labels should be prominent vs. secondary.
     - How to present harnesses so their scope and role are clear.
     - How to support better stopping decisions without over‑prescribing rules.
   - These guidelines can be framed as:
     - General principles for AI/IDE‑integrated security tools, not only fuzzing.

---

## Positioning (for Paper / Proposal)

- We can motivate the study as:
  - Prior work: starting fuzzing from scratch (especially C/C++) is hard; harness setup is a major barrier.
  - Our step: remove harness setup and integrate fuzzing into the IDE with SBOMFuzz.
  - Our question: *Given a reasonable, quickstart‑level intro and a tool that removes setup, what barriers, misunderstandings, and risky behaviors remain?*

- Even with a single IDE condition, we aim to contribute:
  - A taxonomy of breakdowns in fuzzing mental models and workflows under automation.
  - Evidence of miscalibrated trust and stopping rules shaped by tool output.
  - Design guidelines for IDE‑integrated fuzzing and similar automated security tools.

