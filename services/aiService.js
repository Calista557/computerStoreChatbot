import "dotenv/config";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Change this one line to switch models
const MODEL = "gemini-3.5-flash";

// Set USE_MODEL=false in .env to skip the model and use keyword matching only
const USE_MODEL = process.env.USE_MODEL !== "false";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A daily quota error cannot be fixed by retrying, so we detect it
function isQuotaError(error) {
  return error.status === 429 || String(error.message).includes("RESOURCE_EXHAUSTED");
}

const searchProductsTool = {
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

// Keyword version: used when USE_MODEL=false, or when the model call fails
async function extractSearchCriteriaKeywords(customerMessage) {
  const text = customerMessage.toLowerCase();
  const criteria = {};

  // Category
  if (text.includes('desktop') || text.includes('computer')) {
    criteria.category = 'desktop';
  }
  if (text.includes('laptop')) {
    criteria.category = 'laptop';
  }
  if (text.includes('all in one') || text.includes('all-in-one') || text.includes('aio')) {
    criteria.category = 'all-in-one';
  }
  if (text.includes('monitor') || text.includes('screen')) {
    criteria.category = 'monitor';
  }
  if (text.includes('graphics card') || text.includes('graphic card') || text.includes('gpu')) {
    criteria.category = 'gpu';
  }
  if (text.includes('server')) {
    criteria.category = 'server';
  }
  if (text.includes('standalone')) {
    criteria.category = 'standalone-system';
  }
  if (text.includes('thin client')) {
    criteria.category = 'thin-client';
  }
  if (text.includes('keyboard')) {
    criteria.category = 'keyboard';
  }
  if (text.includes('mouse')) {
    criteria.category = 'mouse';
  }
  if (text.includes('accessory') || text.includes('accessories')) {
    criteria.category = 'accessory';
  }

  // Brand
  if (text.includes('dell')) criteria.brand = 'Dell';
  if (text.includes('hp')) criteria.brand = 'HP';

  // RAM -- allow "8gb ram" or "8gb of ram"
  const ramMatch = text.match(/(\d+)\s*gb\s*(?:of\s*)?ram/);
  if (ramMatch) criteria.minRam = Number(ramMatch[1]);

  // Storage type
  if (text.includes('nvme')) criteria.storageType = 'NVMe';
  else if (text.includes('ssd')) criteria.storageType = 'SSD';
  else if (text.includes('hdd')) criteria.storageType = 'HDD';

  // Price -- handles "under 100000", "under 100k", "not more than 150,000"
  const maxPriceMatch = text.match(/(?:under|below|less than|not more than|within)\s*(?:₦|ngn|naira)?\s*([\d,]+)\s*(k)?/);
  if (maxPriceMatch) {
    let value = Number(maxPriceMatch[1].replace(/,/g, ''));
    if (maxPriceMatch[2]) value *= 1000; // "100k" -> 100000
    criteria.maxPrice = value;
  }

  const minPriceMatch = text.match(/(?:above|over|more than|at least)\s*(?:₦|ngn|naira)?\s*([\d,]+)\s*(k)?/);
  if (minPriceMatch) {
    let value = Number(minPriceMatch[1].replace(/,/g, ''));
    if (minPriceMatch[2]) value *= 1000;
    criteria.minPrice = value;
  }

  return criteria;
}

export async function extractSearchCriteria(customerMessage) {
  if (!USE_MODEL) return extractSearchCriteriaKeywords(customerMessage);

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: customerMessage,
        config: {
          httpOptions: { timeout: 10000 },
          tools: [{ functionDeclarations: [searchProductsTool] }],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.ANY,
              allowedFunctionNames: ["search_products"],
            },
          },
        },
      });
      return response.functionCalls?.[0]?.args ?? {};
    } catch (error) {
      if (isQuotaError(error)) {
        console.error("Daily quota reached, using keyword fallback");
        break; // retrying cannot fix a quota problem
      }
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt < maxAttempts) await wait(1500 * attempt);
    }
  }

  return extractSearchCriteriaKeywords(customerMessage);
}

export function detectIntent(customerMessage) {
  const text = customerMessage.toLowerCase();

  if (text.includes('buy') || text.includes('purchase') || text.includes('i want it') || text.includes('i will take it')) {
    return 'ready-to-buy';
  }
  if (text.includes('delivery') || text.includes('deliver') || text.includes('ship')) {
    return 'wants-delivery';
  }
  if (
    text.includes('reduce the price') ||
    text.includes('best price') ||
    text.includes('last price') ||
    text.includes('discount') ||
    text.includes('negotiate')
  ) {
    return 'wants-negotiation';
  }
  if (text.includes('warranty') || text.includes('guarantee')) {
    return 'wants-warranty-info';
  }
  if (text.includes('speak to someone') || text.includes('talk to someone') || text.includes('human') || text.includes('staff')) {
    return 'needs-human-help';
  }

  return 'other';
}

export async function generateReply(customerMessage, products) {
  if (products.length === 0) {
    return 'Sorry, I could not find a matching computer in our current inventory. A staff member can check for you.';
  }

  // Describe every real match, not just the first -- an omitted real
  // option is still an inaccurate answer.
  const descriptions = products.slice(0, 3).map((product) => {
    const configuration = Array.isArray(product.configurations)
      ? product.configurations[0]
      : product.configurations;

    if (!configuration) return `${product.name} (${product.condition || 'condition not listed'})`;

    const parts = [
      configuration.ram ? `${configuration.ram}GB RAM` : null,
      configuration.storage ? `${configuration.storage}GB ${configuration.storageType || ''}`.trim() : null,
    ].filter(Boolean);

    const specsText = parts.length ? ` — ${parts.join(', ')}` : '';
    const priceText = configuration.price ? `, ₦${configuration.price.toLocaleString()}` : '';

    return `${product.name}${specsText}${priceText}`;
  });

  const intro = products.length > 1 ? `We have ${products.length} matching options:` : 'Yes, we have this:';
  const more = products.length > 3 ? `\n(and ${products.length - 3} more -- ask if you want to see them all)` : '';

  return `${intro}\n${descriptions.map((d) => `- ${d}`).join('\n')}${more}`;
}