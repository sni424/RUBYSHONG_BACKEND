import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { upload } from '../middlewares/upload.middleware';
import { uploadImageToAzure } from '../lib/upload';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
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

router.get('/category/:category', async (req: Request<{ category: string }>, res: Response) => {
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

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
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

router.post('/', async (req: Request, res: Response) => {
  const product = await prisma.product.create({
    data: req.body,
  });

  res.status(201).json({
    success: true,
    data: product,
  });
});

// 상품 이미지 업로드 API
router.post('/image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    // 업로드된 이미지 파일
    const file = req.file;

    // 파일 없으면 에러 처리
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '이미지를 업로드해주세요.',
      });
    }

    // Azure Blob Storage 업로드
    const imageUrl = await uploadImageToAzure(file);

    // 프론트에 이미지 URL 반환
    return res.status(201).json({
      success: true,
      data: {
        imageUrl,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: '이미지 업로드 실패',
    });
  }
});

// 상품 등록 API
router.post(
  '/',
  // image 라는 이름으로 파일 1개 받기
  upload.single('image'),

  async (req, res) => {
    try {
      // 업로드된 이미지 파일
      const file = req.file;

      // 파일 없으면 에러 처리
      if (!file) {
        return res.status(400).json({
          message: '이미지를 업로드해주세요.',
        });
      }

      // Azure Blob Storage 업로드
      const imageUrl = await uploadImageToAzure(file);

      // 프론트에서 전달한 데이터
      const { name, category, price, discountRate, finalPrice, stock, status, description } = req.body;

      // DB 저장
      const product = await prisma.product.create({
        data: {
          name,
          slug: `${Date.now()}-${name}`,
          category,
          price: Number(price),
          finalPrice: Number(finalPrice),
          discountRate: Number(discountRate),
          stock: Number(stock),

          summary: description.slice(0, 80),
          description,

          // Azure Blob 이미지 URL 저장
          thumbnailUrl: imageUrl,

          isVisible: true,
        },
      });

      return res.status(201).json({
        success: true,
        product,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: '상품 등록 실패',
      });
    }
  },
);

export default router;
