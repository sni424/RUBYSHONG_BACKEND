import express from 'express';
import cors from 'cors';
import productRoutes from '@/routes/product.routes';
import adminRoutes from '@/routes/admin.routes';

const app = express();

const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('RUBYSHONG API SERVER');
});

app.use('/api/products', productRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.use('/api/admin', adminRoutes);
