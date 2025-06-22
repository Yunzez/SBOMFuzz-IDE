import * as toml from "toml"; // you may need to `npm install toml`
import { log } from "./messaging";

// output  { name: string, path: string }[]
export function findFuzzTargets(functionName, filePath, functionTargets) {
    log("generate fuzzing target");


    // Find the function info with matching name and filePath
    const targetInfo = functionTargets.find(
        (fn) => fn.functionName === functionName && fn.functionLocation.filePath === filePath
    );

    if (!targetInfo) {
        log(`Function ${functionName} not found in ${filePath}`);
        return;
    }

    // Do something with targetInfo...
    log(`Found function`);
    return targetInfo;
}



function preparePrompt(fuzzerChoice) {
  const template = fs.readFileSync("prompt.txt", "utf8");
    template.replace("<fuzzer>", fuzzerChoice);
    template.replace("<function-info>", "");
}

