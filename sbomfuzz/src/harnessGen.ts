import * as fs from "fs";
import * as path from "path";
import * as toml from "toml";
import { OpenAI } from "openai";
import * as dotenv from "dotenv";

export async function generateHarness(
  target: any,
  fuzzRoot: string,
  extensionPath: string
): Promise<boolean> {
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
    return false;
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
    return false;
  }
  fs.writeFileSync(harnessFilePath, result);
  console.log("✅ Harness written to:", harnessFilePath);
  return true; // or false, depending on your logic
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
    const match = response.choices[0].message.content?.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
    const output = match ? match[1].trim() : response.choices[0].message.content;
    return output ?? null;
  } catch (err) {
    console.error("⚠️ OpenAI API error:", err);
    return null;
  }
}
