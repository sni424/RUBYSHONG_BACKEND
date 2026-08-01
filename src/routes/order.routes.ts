import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authAdmin } from '../middlewares/adminAuth.middleware';

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

// 관리자 주문 목록 조회 API
router.get('/admin', authAdmin, async (req: Request, res: Response) => {
  try {
    // 주문 목록 최신순 조회
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
        items: true,
        payment: true,
      },
    });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('관리자 주문 목록 조회 실패:', error);

    return res.status(500).json({
      success: false,
      message: '주문 목록 조회 실패',
    });
  }
});

// 관리자 주문 상세 조회 API
router.get('/admin/:id', authAdmin, async (req: Request<{ id: string }>, res: Response) => {
  try {
    // URL에서 주문 ID 가져오기
    const orderId = Number(req.params.id);

    // 주문 ID 검증
    if (Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 주문 ID입니다.',
      });
    }

    // 주문 상세 조회
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
        items: true,
        payment: true,
        histories: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            changedBy: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('관리자 주문 상세 조회 실패:', error);

    return res.status(500).json({
      success: false,
      message: '주문 상세 조회 실패',
    });
  }
});

// 관리자 주문 상태 변경 API
router.patch('/admin/:id/status', authAdmin, async (req: Request<{ id: string }>, res: Response) => {
  try {
    // URL에서 주문 ID 가져오기
    const orderId = Number(req.params.id);

    // 변경할 주문 상태
    const { status } = req.body;

    // 관리자 ID
    const adminId = req.admin?.id;

    // 주문 ID 검증
    if (Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 주문 ID입니다.',
      });
    }

    // 관리자 로그인 정보 확인
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: '관리자 로그인이 필요합니다.',
      });
    }

    // 허용할 상태 목록
    const allowedStatuses = ['paid', 'preparing', 'shipped', 'delivered', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 주문 상태입니다.',
      });
    }

    // 기존 주문 조회
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
    }

    // 환불 완료 주문은 상태 변경 불가
    if (order.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: '환불된 주문은 상태를 변경할 수 없습니다.',
      });
    }

    // 결제 실패 주문은 상태 변경 불가
    if (order.status === 'failed') {
      return res.status(400).json({
        success: false,
        message: '결제 실패 주문은 상태를 변경할 수 없습니다.',
      });
    }

    // 주문 상태 변경과 이력 저장
    const updatedOrder = await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status,
        histories: {
          create: {
            action: 'status_changed',
            changedById: adminId,
            beforeData: {
              status: order.status,
            },
            afterData: {
              status,
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

    return res.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    console.error('관리자 주문 상태 변경 실패:', error);

    return res.status(500).json({
      success: false,
      message: '주문 상태 변경 실패',
    });
  }
});

// 관리자 주문 환불 처리 API
router.post('/admin/:id/refund', authAdmin, async (req: Request<{ id: string }>, res: Response) => {
  try {
    // URL에서 주문 ID 가져오기
    const orderId = Number(req.params.id);

    // 관리자 ID
    const adminId = req.admin?.id;

    // 주문 ID 검증
    if (Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 주문 ID입니다.',
      });
    }

    // 관리자 로그인 정보 확인
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: '관리자 로그인이 필요합니다.',
      });
    }

    // owner 권한만 환불 가능
    if (req.admin?.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'owner 권한만 환불 처리할 수 있습니다.',
      });
    }

    // 주문 조회
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order || !order.payment) {
      return res.status(404).json({
        success: false,
        message: '주문 정보를 찾을 수 없습니다.',
      });
    }

    // TypeScript null 체크를 위한 결제 정보 변수
    const payment = order.payment;

    // 결제 완료 또는 배송 준비 중인 주문만 환불 처리 가능
    if (order.status !== 'paid' && order.status !== 'preparing') {
      return res.status(400).json({
        success: false,
        message: '환불 처리할 수 없는 주문 상태입니다.',
      });
    }

    // 테스트용 환불 처리
    // TODO: 실결제 전환 시 토스 결제 취소 API를 먼저 호출한 뒤 상태를 변경해야 함
    const refundedOrder = await prisma.$transaction(async (tx) => {
      // 상품 재고 복구
      for (const item of order.items) {
        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      // 결제 상태 환불 완료로 변경
      await tx.payment.update({
        where: {
          orderId: order.id,
        },
        data: {
          status: 'refunded',
        },
      });

      // 주문 상태 환불 완료로 변경 및 이력 저장
      return tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'refunded',
          histories: {
            create: {
              action: 'refunded',
              changedById: adminId,
              beforeData: {
                status: order.status,
                paymentStatus: payment.status,
              },
              afterData: {
                status: 'refunded',
                paymentStatus: 'refunded',
                restoredItems: order.items.map((item) => ({
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
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
    });

    return res.json({
      success: true,
      data: refundedOrder,
    });
  } catch (error) {
    console.error('관리자 주문 환불 처리 실패:', error);

    return res.status(500).json({
      success: false,
      message: '주문 환불 처리 실패',
    });
  }
});

export default router;
