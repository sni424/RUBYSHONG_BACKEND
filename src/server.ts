import express from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes';
import adminRoutes from './routes/admin.routes';
import reservationRoutes from './routes/reservation.routes';
import contactRoutes from './routes/contact.routes';
import authRoutes from './routes/auth.routes';

const app = express();

const PORT = process.env.PORT || 4000;

app.use('/api/auth', authRoutes);

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://rubyshong.vercel.app',
      'https://rubyshong-project-for-mom.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('RUBYSHONG API SERVER');
});

app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/contacts', contactRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
