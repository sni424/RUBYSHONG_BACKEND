import { Router } from 'express';
import prisma from '@/lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  const products = await prisma.product.findMany({
    where: {
      isVisible: true,
    },
  });

  res.json({
    success: true,
    data: products,
  });
});

router.get('/category/:category', async (req, res) => {
  const { category } = req.params;

  const products = await prisma.product.findMany({
    where: {
      category,
      isVisible: true,
    },
  });

  res.json({
    success: true,
    data: products,
  });
});

router.get('/:id', async (req, res) => {
  const productId = Number(req.params.id);

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

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

router.post('/', async (req, res) => {
  const product = await prisma.product.create({
    data: req.body,
  });

  res.status(201).json({
    success: true,
    data: product,
  });
});

export default router;
