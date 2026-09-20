import express from 'express';
import Product from '../models/product.js';
import { searchProducts } from '../services/productService.js';

const router = express.Router();

// GET /api/products?category=desktop&minPrice=90000&maxPrice=100000&minRam=8&storageType=SSD
router.get('/', async (req, res) => {
  try {
    const products = await searchProducts(req.query);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products -- create a new product (used for adding real inventory)
router.post('/', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/products/:id -- fetch a single product by its real MongoDB _id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;