import "dotenv/config";
import { extractSearchCriteria, stats } from "./services/aiService.js";
import { evalCases } from "./evalCases.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sameCriteria(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

// Pause between calls only when the model is being used
const delay = process.env.USE_MODEL === "false" ? 0 : 5000;

let passed = 0;

for (const testCase of evalCases) {
  const got = await extractSearchCriteria(testCase.message);
  const ok = sameCriteria(got, testCase.expected);
  if (ok) passed++;

  console.log(ok ? "PASS" : "FAIL", "-", testCase.message);
  if (!ok) {
    console.log("   expected:", JSON.stringify(testCase.expected));
    console.log("   got:     ", JSON.stringify(got));
  }
  if (delay) await wait(delay);
}

console.log(`\nScore: ${passed} / ${evalCases.length}`);
console.log(`Answered by the model: ${evalCases.length - stats.fallbacks} / ${evalCases.length}`);