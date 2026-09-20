import { extractSearchCriteria } from "./services/aiService.js";

const messages = [
  "A laptop with a 15 inch screen",
  "Do you have servers?",
  "I need a laptop under 200k",
];

for (const message of messages) {
  console.log(message);
  console.log(await extractSearchCriteria(message));
  console.log("---");
  await new Promise((resolve) => setTimeout(resolve, 5000));
}