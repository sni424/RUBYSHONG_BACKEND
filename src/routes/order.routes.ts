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
    // items: [{ productId, quantity }]
    const { items, ordererName, ordererPhone, userId } = req.body;

    // 필수 값 검증
    if (!items || !Array.isArray(items) || items.length === 0 || !ordererName || !ordererPhone) {
      return res.status(400).json({
        success: false,
        message: '필수 주문 정보를 입력해주세요.',
      });
    }

    // 상품 ID와 수량 검증
    for (const item of items) {
      if (!item.productId || !item.quantity || Number(item.quantity) < 1) {
        return res.status(400).json({
          success: false,
          message: '주문 상품 정보가 올바르지 않습니다.',
        });
      }
    }

    // 중복 상품 ID 제거
    const productIds = [...new Set(items.map((item) => Number(item.productId)))];

    // 주문하려는 상품 목록 조회
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    // 요청한 상품을 모두 찾았는지 확인
    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: '구매할 수 없는 상품이 포함되어 있습니다.',
      });
    }

    // 주문 상품 데이터 생성
    const orderItems = items.map((item) => {
      const product = products.find((product) => product.id === Number(item.productId));
      const quantity = Number(item.quantity);

      // 상품 판매 가능 여부 확인
      if (!product || !product.isVisible || product.status !== 'selling') {
        throw new Error('구매할 수 없는 상품입니다.');
      }

      // 재고 확인
      if (product.stock < quantity) {
        throw new Error(`${product.name} 상품 재고가 부족합니다.`);
      }

      // 서버 기준 상품별 결제 금액 계산
      const amount = product.finalPrice * quantity;

      return {
        product,
        quantity,
        amount,
      };
    });

    // 서버 기준 총 결제 금액 계산
    const totalAmount = orderItems.reduce((sum, item) => sum + item.amount, 0);

    // 주문번호 생성
    const orderCode = createOrderCode();

    // 첫 번째 주문 상품
    const firstOrderItem = orderItems[0];

    if (!firstOrderItem) {
      return res.status(400).json({
        success: false,
        message: '주문 상품 정보가 올바르지 않습니다.',
      });
    }

    // 토스 결제창에 보여줄 주문명
    const orderName =
      orderItems.length === 1
        ? firstOrderItem.product.name
        : `${firstOrderItem.product.name} 외 ${orderItems.length - 1}건`;

    // 주문과 결제 준비 데이터를 함께 생성
    const order = await prisma.order.create({
      data: {
        orderCode,
        userId: userId ? Number(userId) : null,
        ordererName,
        ordererPhone,
        totalAmount,
        items: {
          create: orderItems.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            thumbnailUrl: item.product.thumbnailUrl,
            price: item.product.finalPrice,
            quantity: item.quantity,
            amount: item.amount,
          })),
        },
        payment: {
          create: {
            tossOrderId: orderCode,
            amount: totalAmount,
          },
        },
        histories: {
          create: {
            action: 'created',
            afterData: {
              orderCode,
              totalAmount,
              items: orderItems.map((item) => ({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                amount: item.amount,
              })),
            },
          },
        },
      },
      include: {
        items: true,
        payment: true,
        histories: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        orderCode: order.orderCode,
        orderName,
        amount: order.totalAmount,
      },
    });
  } catch (error) {
    console.error('주문 생성 실패:', error);

    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: '주문 생성 실패',
    });
  }
});

export default router;
