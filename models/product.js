import mongoose from "mongoose";
const { Schema } = mongoose;

const configurationSchema = new Schema(
  {
    series: { type: String, trim: true },

    processor: { type: String, trim: true },
    generation: { type: Number },
    ram: { type: Number },
    storage: { type: Number },
    storageType: { type: String, trim: true, enum: ["HDD", "SSD", "NVMe"] },
    formFactor: { type: String, trim: true, enum: ["tower", "flat"] },

    screenSizeInches: Number,
    resolution: String,
    gpuModel: String,
    vramGB: Number,
    connectionType: { type: String, enum: ["wired", "wireless", "bluetooth"] },

    extraSpecs: { type: Map, of: String },

    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN" },
    stockQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        "laptop",
        "desktop",
        "all-in-one",
        "monitor",
        "gpu",
        "server",
        "standalone-system",
        "thin-client",
        "keyboard",
        "mouse",
        "accessory",
      ],
    },
    brand: { type: String, trim: true },
    condition: {
      type: String,
      trim: true,
      enum: ["used", "refurbished", "new"],
    },
    images: [{ type: String }],
    description: { type: String, trim: true },
    configurations: [configurationSchema],
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);
export default Product;
