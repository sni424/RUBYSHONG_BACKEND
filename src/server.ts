import express from 'express';
import cors from 'cors';
import productRoutes from '@/routes/product.routes';
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
