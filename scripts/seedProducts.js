import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const products = [
  {
    name: "Dell i5 Tower",
    category: "desktop",
    brand: "Dell",
    condition: "refurbished",
    description:
      "Reliable Dell OptiPlex desktop suitable for office and business use.",
    configurations: [
      {
        series: "OptiPlex 7040",
        processor: "Intel Core i5",
        generation: 6,
        ram: 8,
        storage: 256,
        storageType: "SSD",
        formFactor: "tower",
        price: 120000,
        currency: "NGN",
        stockQuantity: 2,
      },
    ],
  },

  {
    name: "Dell i5 Flat",
    category: "desktop",
    brand: "Dell",
    condition: "refurbished",
    description:
      "Compact Dell OptiPlex desktop for office and everyday computing.",
    configurations: [
      {
        series: "OptiPlex 7050",
        processor: "Intel Core i5",
        generation: 7,
        ram: 8,
        storage: 256,
        storageType: "SSD",
        formFactor: "flat",
        price: 135000,
        currency: "NGN",
        stockQuantity: 3,
      },
    ],
  },

  {
    name: "HP i5 Desktop",
    category: "desktop",
    brand: "HP",
    condition: "refurbished",
    description:
      "HP business desktop suitable for office applications and general use.",
    configurations: [
      {
        series: "EliteDesk 800 G2",
        processor: "Intel Core i5",
        generation: 6,
        ram: 8,
        storage: 256,
        storageType: "SSD",
        formFactor: "tower",
        price: 125000,
        currency: "NGN",
        stockQuantity: 2,
      },
    ],
  },

  {
    name: "Dell Core i7 Laptop",
    category: "laptop",
    brand: "Dell",
    condition: "refurbished",
    description:
      "Dell business laptop suitable for professional and everyday computing.",
    configurations: [
      {
        series: "Latitude 7480",
        processor: "Intel Core i7",
        generation: 7,
        ram: 16,
        storage: 512,
        storageType: "SSD",
        screenSizeInches: 14,
        price: 250000,
        currency: "NGN",
        stockQuantity: 2,
      },
    ],
  },

  {
    name: "HP Core i5 Laptop",
    category: "laptop",
    brand: "HP",
    condition: "refurbished",
    description:
      "HP business laptop with SSD storage and good everyday performance.",
    configurations: [
      {
        series: "EliteBook 840 G5",
        processor: "Intel Core i5",
        generation: 8,
        ram: 8,
        storage: 256,
        storageType: "SSD",
        screenSizeInches: 14,
        price: 220000,
        currency: "NGN",
        stockQuantity: 2,
      },
    ],
  },

  {
    name: "Dell 24 Inch Monitor",
    category: "monitor",
    brand: "Dell",
    condition: "used",
    description:
      "Dell 24-inch monitor suitable for office and computer setups.",
    configurations: [
      {
        screenSizeInches: 24,
        resolution: "1920x1080",
        price: 75000,
        currency: "NGN",
        stockQuantity: 4,
      },
    ],
  },

  {
    name: "NVIDIA GTX Graphics Card",
    category: "gpu",
    brand: "NVIDIA",
    condition: "used",
    description:
      "NVIDIA graphics card for systems requiring dedicated graphics.",
    configurations: [
      {
        gpuModel: "GTX 1060",
        vramGB: 6,
        price: 150000,
        currency: "NGN",
        stockQuantity: 2,
      },
    ],
  },

  {
    name: "Dell Thin Client",
    category: "thin-client",
    brand: "Dell",
    condition: "refurbished",
    description:
      "Compact Dell thin client for lightweight computing environments.",
    configurations: [
      {
        series: "Wyse",
        processor: "AMD",
        ram: 4,
        storage: 16,
        storageType: "SSD",
        price: 60000,
        currency: "NGN",
        stockQuantity: 5,
      },
    ],
  },

  {
    name: "Dell Server",
    category: "server",
    brand: "Dell",
    condition: "refurbished",
    description:
      "Dell server system suitable for business and network environments.",
    configurations: [
      {
        series: "PowerEdge",
        processor: "Intel Xeon",
        ram: 32,
        storage: 1000,
        storageType: "HDD",
        price: 450000,
        currency: "NGN",
        stockQuantity: 1,
      },
    ],
  },

  {
    name: "USB Keyboard",
    category: "keyboard",
    brand: "Dell",
    condition: "new",
    description:
      "Standard USB keyboard for desktop computer systems.",
    configurations: [
      {
        connectionType: "wired",
        price: 10000,
        currency: "NGN",
        stockQuantity: 10,
      },
    ],
  },

  {
    name: "USB Mouse",
    category: "mouse",
    brand: "Dell",
    condition: "new",
    description:
      "Standard USB mouse for desktop and laptop users.",
    configurations: [
      {
        connectionType: "wired",
        price: 7000,
        currency: "NGN",
        stockQuantity: 10,
      },
    ],
  },
];

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    // Clear existing development/test products
    await Product.deleteMany({});

    // Insert the seed inventory
    const insertedProducts = await Product.insertMany(products);

    console.log(
      `${insertedProducts.length} products seeded successfully`
    );

    insertedProducts.forEach((product) => {
      console.log(`- ${product.name} (${product.category})`);

      product.configurations.forEach((configuration) => {
        console.log(
          `  • ${configuration.storageType || configuration.resolution || "config"} — ₦${configuration.price.toLocaleString()} (stock: ${configuration.stockQuantity})`
        );
      });
    });

    await mongoose.connection.close();

    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seedProducts();

