import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-3.5-flash",
  contents: "Do you have a laptop under 200k?",
  config: {
    systemInstruction: "You are a sales assistant for a computer shop in Onitsha.",
  },
});

console.log(response.text);
console.log("Finish reason:", response.candidates?.[0]?.finishReason);
console.log("Token usage:", response.usageMetadata);