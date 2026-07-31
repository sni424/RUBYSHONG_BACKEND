import express from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes';
import adminRoutes from './routes/admin.routes';
import reservationRoutes from './routes/reservation.routes';
import contactRoutes from './routes/contact.routes';
import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';

const app = express();

const PORT = process.env.PORT || 4000;

// CORS 허용 설정
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://rubyshong.vercel.app',
    'https://rubyshong-project-for-mom.vercel.app',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// CORS는 모든 라우터보다 먼저 적용
app.use(cors(corsOptions));

// JSON 요청 본문 파싱
app.use(express.json());

// 서버 상태 확인 API
app.get('/', (req, res) => {
  res.send('RUBYSHONG API SERVER');
});

// API 라우터 등록
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
//주문
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/contacts', contactRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
