import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const SEARCH_DIRS = ["tests"];
const TEST_FILE_RE = /\.(test|spec)\.(c|m)?js$/i;

function walk(dirPath, acc = []) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
      walk(fullPath, acc);
      continue;
    }

    if (TEST_FILE_RE.test(entry.name)) {
      acc.push(resolve(fullPath));
    }
  }
  return acc;
}

const discovered = SEARCH_DIRS.flatMap((dirName) => {
  const fullPath = resolve(ROOT, dirName);
  try {
    if (!statSync(fullPath).isDirectory()) return [];
  } catch {
    return [];
  }
  return walk(fullPath);
});

const uniqueFiles = Array.from(
  new Map(discovered.map((filePath) => [filePath.toLowerCase(), filePath])).values()
);
const args = process.argv.slice(2);
const shouldList = args.includes("--list");

if (shouldList) {
  if (!uniqueFiles.length) {
    console.log("No runnable test files found.");
    process.exit(0);
  }

  console.log("Runnable test files:");
  uniqueFiles.forEach((filePath) => console.log(filePath));
  process.exit(0);
}

if (!uniqueFiles.length) {
  console.log("No runnable .test.js/.spec.js files found in tests/.");
  console.log("Legacy fixtures can stay in tests/legacy/, but only runnable test files are executed.");
  process.exit(0);
}

let failed = false;

for (const filePath of uniqueFiles) {
  const relativePath = filePath.replace(`${ROOT}\\`, "").replace(`${ROOT}/`, "");
  const startedAt = performance.now();

  try {
    const testModule = await import(`file:///${filePath.replace(/\\/g, "/")}`);
    const testFn = testModule.run ?? testModule.default;

    if (typeof testFn !== "function") {
      throw new Error(
        "Test module must export a named `run` function or a default function"
      );
    }

    await testFn();
    const durationMs = Math.round(performance.now() - startedAt);
    console.log(`PASS ${relativePath} (${durationMs} ms)`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${relativePath}`);
    console.error(error?.stack || error);
  }
}

if (failed) {
  process.exit(1);
}
