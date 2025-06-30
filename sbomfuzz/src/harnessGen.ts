import * as fs from "fs";
import * as path from "path";
import * as toml from "toml";
import { OpenAI } from "openai";
import * as dotenv from "dotenv";
import { spawn } from "child_process";
export async function generateHarness(
  target: any,
  fuzzRoot: string,
  extensionPath: string
): Promise<{ success: boolean; targetPath?: string }> {
  const targetName = `fuzz_target_${target.functionName}`;
  const harnessFilePath = path.join(
    fuzzRoot,
    "fuzz_targets",
    `${targetName}.rs`
  );

  const promptPath = path.join(extensionPath, "src", "prompt.txt");
  console.log("prompt path", promptPath);
  // 🔹 Load and prepare the template
  if (!fs.existsSync(promptPath)) {
    console.error("Missing prompt.txt");
    return { success: false };
  }

  const functionInfo =
    [
      `Function: ${target.functionName || ""}`,
      `Crate: ${target.functionCrate || ""}`,
      `Module: ${target.functionModulePath || ""}`,
      `Description: ${target.functionDescription || ""}`,
      `Parameters: ${target.functionParameters || ""}`,
    ].join("\n") + "\n";

  // Add your harness generation logic here
  let template = fs.readFileSync(promptPath, "utf8");
  template = template
    .replace(/<fuzzer>/g, "cargo-fuzz")
    .replace(/<function-info>/g, functionInfo);
  console.log("Generated harness template:", template);

  const result = await generateHarnessFromPrompt(template, extensionPath);
  if (!result) {
    return { success: false };
  }
  fs.writeFileSync(harnessFilePath, result);
  console.log(
    "✅ Harness written to:",
    harnessFilePath,
    "adding to Cargo.toml"
  );

  const cargoTomlPath = path.join(fuzzRoot, "Cargo.toml");
  // Prepare the entry as an array and join with newlines for neatness
  const cargoTomlEntry = [
    "",
    "[[bin]]",
    `name = "${targetName}"`,
    `path = "fuzz_targets/${targetName}.rs"`,
    "test = false",
    "doc = false",
    "bench = false",
  ].join("\n");

  // Avoid duplication
  const existingToml = fs.readFileSync(cargoTomlPath, "utf8");
  if (!existingToml.includes(`name = "${targetName}"`)) {
    fs.appendFileSync(cargoTomlPath, cargoTomlEntry);
    console.log(`✅ Appended new bin entry to Cargo.toml for ${targetName}`);
  } else {
    console.log(`ℹ️ Bin entry for ${targetName} already exists in Cargo.toml`);
  }

  return { success: true, targetPath: harnessFilePath };
}

async function generateHarnessFromPrompt(
  prompt: string,
  extensionPath: string
): Promise<string | null> {
  const envPath = path.join(extensionPath, ".env");
  dotenv.config({ path: envPath });
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("❌ Missing OpenAI API key");
    return null;
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant specialized in Rust fuzzing harness generation, stick to the template and be concise.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
    });

    // Extract code block content from response, ignoring ``` and language
    const match = response.choices[0].message.content?.match(
      /```(?:\w+)?\s*([\s\S]*?)\s*```/
    );
    const output = match
      ? match[1].trim()
      : response.choices[0].message.content;
    return output ?? null;
  } catch (err) {
    console.error("⚠️ OpenAI API error:", err);
    return null;
  }
}

/**
 * Optimizes a fuzzing harness by running a single fuzzing attempt and capturing any errors.
 *
 * @param target - The target object containing information about the fuzz target, including the function name.
 * @param root - The fuzz directory path.
 * @param filePath - The path to the file containing the fuzz target.
 * @param extensionPath - The path to this extension directory.
 */
export async function optimizeHarness(
  target: any,
  root: string,
  filePath: string,
  extensionPath: string,
  iteration: number = 0
): Promise<{ success: boolean }> {
  iteration++;
  const targetName = `fuzz_target_${target.functionName}`;
  const envPath = path.join(__dirname, ".env");
  dotenv.config({ path: envPath });
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("❌ Missing OpenAI API key");
    return { success: false };
  }

  const openai = new OpenAI({ apiKey });

  console.log(`🔁 Running fuzz attempt #${iteration}`);

  const runHarnessBuild = (): Promise<string> =>
    new Promise((resolve) => {
      const proc = spawn("cargo", ["fuzz", "build", targetName], {
        cwd: root,
        env: {
          ...process.env,
          RUSTFLAGS: "-Awarnings",
        },
      });

      let stderr = "";
      proc.stderr.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (!line.toLowerCase().includes("warning")) {
            stderr += line + "\n";
          }
        }
      });

      proc.on("close", () => {
        resolve(stderr);
      });
    });

  const errorOutput = await runHarnessBuild();
  console.log("Harness run output:", errorOutput);

  if (!errorOutput.includes("error") && !errorOutput.includes("panic")) {
    console.log("Yay! Harness ran without errors!");
    return { success: true };
  }

  if (iteration > 2) {
    console.error("❌ Maximum optimization attempts reached");
    return { success: false };
  }

  // Read prompt and inject error/code into it
  const originalCode = fs.readFileSync(filePath, "utf8");
  const promptPath = path.join(extensionPath, "src", "optimize.txt");

  if (!fs.existsSync(promptPath)) {
    console.error("Missing optimize.txt");
    return { success: false };
  }

  let template = fs.readFileSync(promptPath, "utf8");
  template = template
    .replace(/<HARNESS-CODE>/g, originalCode)
    .replace(/<ERROR-LOG>/g, errorOutput);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: template }],
      temperature: 0.3,
    });

    const fixedCode = response.choices?.[0]?.message?.content;
    if (!fixedCode) {
      console.error("❌ No valid response from OpenAI");
      return { success: false };
    }

    const cleaned = stripMarkdownCodeBlock(fixedCode);
    fs.writeFileSync(filePath, cleaned);
    console.log("new harness code:", cleaned);
    console.log(`✍️ Rewritten harness, retrying (iteration ${iteration})...`);

    // RECURSE
    return optimizeHarness(target, root, filePath, extensionPath, iteration);
  } catch (err) {
    console.error("❌ Error optimizing harness:", err);
    return { success: false };
  }
}

function runSelectedHarness(targetName: string, root: string): void {
  // This function is a placeholder for running the selected harness.
  // You can implement the logic to execute the fuzz target here.
  console.log("Running selected harness...");
  const proc = spawn("cargo", ["fuzz", "run", targetName, "--", "-runs=1"], {
    cwd: root,
    env: {
      ...process.env,
      RUSTFLAGS: "-Awarnings",
    },
  });
  // Example: spawn a process to run the fuzz target
  // const proc = spawn("cargo", ["fuzz", "run", "fuzz_target_name"]);
  // proc.stdout.on("data", (data) => console.log(data.toString()));
  // proc.stderr.on("data", (data) => console.error(data.toString()));
}

function stripMarkdownCodeBlock(text: string): string {
  return text
    .replace(/^```[a-z]*\n/, "")
    .replace(/```$/, "")
    .trim();
}
