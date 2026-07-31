import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// 주문번호 생성
const createOrderCode = () => {
  // 토스페이먼츠 orderId로 사용할 고유 주문번호
  return `RUBYSHONG_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
};

// 주문 생성 API
router.post('/', async (req: Request, res: Response) => {
  try {
    // 프론트에서 보낸 주문 정보
    const { productId, quantity, ordererName, ordererPhone, userId } = req.body;

    // 필수 값 검증
    if (!productId || !quantity || !ordererName || !ordererPhone) {
      return res.status(400).json({
        success: false,
        message: '필수 주문 정보를 입력해주세요.',
      });
    }

    // 수량 검증
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: '주문 수량이 올바르지 않습니다.',
      });
    }

    // 상품 조회
    const product = await prisma.product.findUnique({
      where: {
        id: Number(productId),
      },
    });

    // 상품이 없거나 판매 중이 아니면 주문 불가
    if (!product || !product.isVisible || product.status !== 'selling') {
      return res.status(400).json({
        success: false,
        message: '구매할 수 없는 상품입니다.',
      });
    }

    // 재고 확인
    if (product.stock < Number(quantity)) {
      return res.status(400).json({
        success: false,
        message: '상품 재고가 부족합니다.',
      });
    }

    // 서버 기준 최종 금액 계산
    const price = product.finalPrice;
    const totalAmount = price * Number(quantity);
    const orderCode = createOrderCode();

    // 주문과 결제 준비 데이터를 함께 생성
    const order = await prisma.order.create({
      data: {
        orderCode,
        userId: userId ? Number(userId) : null,
        ordererName,
        ordererPhone,
        totalAmount,
        items: {
          create: [
            {
              productId: product.id,
              productName: product.name,
              thumbnailUrl: product.thumbnailUrl,
              price,
              quantity: Number(quantity),
              amount: totalAmount,
            },
          ],
        },
        payment: {
          create: {
            tossOrderId: orderCode,
            amount: totalAmount,
          },
        },
      },
      include: {
        items: true,
        payment: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        orderCode: order.orderCode,
        orderName: product.name,
        amount: order.totalAmount,
      },
    });
  } catch (error) {
    console.error('주문 생성 실패:', error);

    return res.status(500).json({
      success: false,
      message: '주문 생성 실패',
    });
  }
});

export default router;
