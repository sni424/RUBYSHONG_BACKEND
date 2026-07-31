import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

type TossPaymentConfirmResponse = {
  paymentKey: string;
  orderId: string;
  orderName: string;
  method?: string;
  totalAmount: number;
  approvedAt?: string;
};

// 토스페이먼츠 결제 승인 API
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    // 토스 결제 성공 후 프론트에서 전달하는 값
    const { paymentKey, orderCode, amount } = req.body;

    // 필수 값 검증
    if (!paymentKey || !orderCode || !amount) {
      return res.status(400).json({
        success: false,
        message: '필수 결제 정보를 입력해주세요.',
      });
    }

    // 토스 시크릿 키 확인
    const tossSecretKey = process.env.TOSS_SECRET_KEY;

    if (!tossSecretKey) {
      return res.status(500).json({
        success: false,
        message: '토스페이먼츠 설정이 없습니다.',
      });
    }

    // 주문 조회
    const order = await prisma.order.findUnique({
      where: {
        orderCode,
      },
      include: {
        items: true,
        payment: true,
      },
    });

    // 주문 존재 여부 확인
    if (!order || !order.payment) {
      return res.status(404).json({
        success: false,
        message: '주문 정보를 찾을 수 없습니다.',
      });
    }

    // pending 주문만 결제 승인 가능
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '이미 처리된 주문입니다.',
      });
    }

    // 서버에 저장된 주문 금액과 프론트에서 받은 금액 비교
    if (order.totalAmount !== Number(amount)) {
      return res.status(400).json({
        success: false,
        message: '결제 금액이 일치하지 않습니다.',
      });
    }

    // 토스 시크릿 키는 Basic 인증 형태로 전달
    const encodedSecretKey = Buffer.from(`${tossSecretKey}:`).toString('base64');

    // 토스페이먼츠 결제 승인 요청
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId: order.orderCode,
        amount: order.totalAmount,
      }),
    });

    const tossData = (await tossResponse.json()) as TossPaymentConfirmResponse & {
      message?: string;
    };

    // 토스 승인 실패 처리
    if (!tossResponse.ok) {
      await prisma.payment.update({
        where: {
          orderId: order.id,
        },
        data: {
          status: 'failed',
          failureReason: tossData.message ?? '토스 결제 승인 실패',
          rawData: tossData,
        },
      });

      return res.status(400).json({
        success: false,
        message: tossData.message ?? '결제 승인 실패',
      });
    }

    // 결제 승인 성공 후 주문/결제/재고를 transaction으로 처리
    const paidOrder = await prisma.$transaction(async (tx) => {
      // 주문 상품 재고 차감
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
          select: {
            stock: true,
          },
        });

        if (!product || product.stock < item.quantity) {
          throw new Error('상품 재고가 부족합니다.');
        }

        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 결제 정보 업데이트
      await tx.payment.update({
        where: {
          orderId: order.id,
        },
        data: {
          paymentKey: tossData.paymentKey,
          status: 'paid',
          method: tossData.method ?? null,
          approvedAt: tossData.approvedAt ? new Date(tossData.approvedAt) : new Date(),
          rawData: tossData,
        },
      });

      // 주문 상태 결제 완료로 변경
      return tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'paid',
        },
        include: {
          items: true,
          payment: true,
        },
      });
    });

    return res.json({
      success: true,
      data: paidOrder,
    });
  } catch (error) {
    console.error('결제 승인 실패:', error);

    return res.status(500).json({
      success: false,
      message: '결제 승인 실패',
    });
  }
});

export default router;
