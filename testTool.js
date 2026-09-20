import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const searchProducts = {
  name: "search_products",
  description:
    "Search the shop's real inventory. Call this whenever a customer asks about products, specs, or prices.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        enum: [
          "desktop", "laptop", "all-in-one", "monitor", "gpu", "server",
          "standalone-system", "thin-client", "keyboard", "mouse", "accessory",
        ],
        description: "The type of product the customer wants",
      },
      brand: { type: Type.STRING, description: "Brand name, for example Dell or HP" },
      minRam: { type: Type.NUMBER, description: "Minimum RAM in GB" },
      storageType: {
        type: Type.STRING,
        enum: ["SSD", "HDD", "NVMe"],
        description: "Type of storage drive",
      },
      maxPrice: { type: Type.NUMBER, description: "Maximum price in naira, as a full number" },
      minPrice: { type: Type.NUMBER, description: "Minimum price in naira, as a full number" },
    },
  },
};

const messages = [
  "A laptop with a 15 inch screen",
  "Delivery within 3 days for a Dell with 8gb ram",
  "I need RAM of 8GB, SSD, at least 100k",
];

for (const message of messages) {
  console.log("Sending:", message);
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: { tools: [{ functionDeclarations: [searchProducts] }] },
    });
    console.log(JSON.stringify(response.functionCalls, null, 2));
  } catch (error) {
    console.log("ERROR:", error.message);
  }
  console.log("---");
  await new Promise((resolve) => setTimeout(resolve, 5000));
}