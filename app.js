import 'dotenv/config';
import express from 'express';
import connectDB from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import inquiryRoutes from './routes/inquiryRoutes.js';

const app = express();

app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/inquiries', inquiryRoutes);

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });