import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { upload } from '../middlewares/upload.middleware';
import { uploadImageToAzure } from '../lib/upload';
import { authAdmin } from '../middlewares/adminAuth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

// 상품 삭제 이력 조회 API
router.get('/admin/delete-logs', authAdmin, async (req: Request, res: Response) => {
  try {
    // 최근 삭제순으로 상품 삭제 이력 조회
    const deleteLogs = await prisma.productDeleteLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        deletedBy: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: deleteLogs,
    });
  } catch (error) {
    console.error('상품 삭제 이력 조회 실패:', error);

    return res.status(500).json({
      success: false,
      message: '상품 삭제 이력 조회 실패',
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  const { category, search } = req.query;

  const products = await prisma.product.findMany({
    where: {
      isVisible: true,
      ...(category
        ? {
            category: String(category),
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: String(search),
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: String(search),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: products,
  });
});

router.get('/category/:category', async (req: Request<{ category: string }>, res: Response) => {
  const { category } = req.params;
  const { search } = req.query;

  const products = await prisma.product.findMany({
    where: {
      category,
      isVisible: true,
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: String(search),
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: String(search),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: 'desc',
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

// 상품 수정 API
router.patch('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    // URL에서 상품 id 가져오기
    const productId = Number(req.params.id);

    // 프론트에서 수정할 상품 데이터 받기
    const {
      name,
      category,
      price,
      finalPrice,
      discountRate,
      summary,
      description,
      thumbnailUrl,
      stock,
      status,
      isNew,
      isBest,
      isVisible,
    } = req.body;

    // 상품 id가 숫자가 아니면 요청 거절
    if (Number.isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 상품 ID입니다.',
      });
    }

    // 상품 수정
    const product = await prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        name,
        category,
        price: Number(price),
        finalPrice: Number(finalPrice),
        discountRate: Number(discountRate || 0),
        summary,
        description,
        thumbnailUrl,
        stock: Number(stock),
        status,
        isNew: Boolean(isNew),
        isBest: Boolean(isBest),
        isVisible: Boolean(isVisible),
      },
    });

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('상품 수정 실패:', error);

    return res.status(500).json({
      success: false,
      message: '상품 수정 실패',
    });
  }
});

// 상품 삭제 API
// 상품 삭제 API
router.delete('/:id', authAdmin, requireRole(['owner']), async (req: Request<{ id: string }>, res: Response) => {
  try {
    // URL에서 상품 id 가져오기
    const productId = Number(req.params.id);

    // 로그인한 관리자 정보 가져오기
    const adminUser = req.adminUser;

    // 상품 id가 숫자가 아니면 요청 거절
    if (Number.isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 상품 ID입니다.',
      });
    }

    // 관리자 정보가 없으면 요청 거절
    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.',
      });
    }

    await prisma.$transaction(async (tx) => {
      // 삭제 전 상품 정보 조회
      const product = await tx.product.findUnique({
        where: {
          id: productId,
        },
      });

      // 상품이 없으면 삭제 불가
      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      // 상품 삭제 이력 저장
      await tx.productDeleteLog.create({
        data: {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          deletedById: adminUser.id,
          deletedData: JSON.parse(JSON.stringify(product)),
        },
      });

      // 상품 실제 삭제
      await tx.product.delete({
        where: {
          id: productId,
        },
      });
    });

    return res.json({
      success: true,
      message: '상품이 삭제되었습니다.',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.',
      });
    }

    console.error('상품 삭제 실패:', error);

    return res.status(500).json({
      success: false,
      message: '상품 삭제 실패',
    });
  }
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
    console.error('Azure 이미지 업로드 실패 상세:', error);

    return res.status(500).json({
      success: false,
      message: '이미지 업로드 실패',
    });
  }
});

// 상품 등록 API
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, category, price, discountRate, finalPrice, stock, status, summary, description, thumbnailUrl } =
      req.body;

    if (!thumbnailUrl) {
      return res.status(400).json({
        success: false,
        message: '상품 이미지 URL이 없습니다.',
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug: `${Date.now()}-${name}`,
        category,
        price: Number(price),
        discountRate: Number(discountRate || 0),
        finalPrice: finalPrice ? Number(finalPrice) : Number(price),
        stock: Number(stock),
        summary,
        description,
        thumbnailUrl,
        isVisible: status !== 'hidden',
      },
    });

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('상품 등록 실패:', error);

    return res.status(500).json({
      success: false,
      message: '상품 등록 실패',
    });
  }
});

export default router;
