import "dotenv/config";
import { extractSearchCriteria, stats } from "./services/aiService.js";

console.log(await extractSearchCriteria("A laptop with a 15 inch screen"));
console.log("Fallbacks:", stats.fallbacks);