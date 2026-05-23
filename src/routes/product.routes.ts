import { Router } from 'express';
import { products } from '../data/products';

const router = Router();

router.get('/', (req, res) => {
  const visibleProducts = products.filter((product) => product.isVisible);

  res.json({
    success: true,
    data: visibleProducts,
  });
});

router.get('/category/:category', (req, res) => {
  const { category } = req.params;

  const filteredProducts = products.filter((product) => product.category === category && product.isVisible);

  res.json({
    success: true,
    data: filteredProducts,
  });
});

router.get('/:id', (req, res) => {
  const productId = Number(req.params.id);
  const product = products.find((item) => item.id === productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: '상품을 찾을 수 없습니다.',
    });
  }

  res.json({
    success: true,
    data: product,
  });
});

export default router;
