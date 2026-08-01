import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authAdmin } from '../middlewares/adminAuth.middleware';

const router = Router();

// 관리자 고객 목록 조회 API
router.get('/admin', authAdmin, async (req: Request, res: Response) => {
  try {
    // 고객 목록을 최신 가입순으로 조회
    const customers = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        phoneVerified: true,
        provider: true,
        providerId: true,
        createdAt: true,
        updatedAt: true,

        // 고객별 주문 개수와 총 결제 금액 계산용 주문 목록
        orders: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // 화면에서 바로 쓰기 좋게 고객별 요약 데이터 가공
    const customerList = customers.map((customer) => {
      // 결제 완료된 주문만 구매 금액에 포함
      const paidOrders = customer.orders.filter((order) => order.status === 'paid');

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        phoneVerified: customer.phoneVerified,
        provider: customer.provider,
        providerId: customer.providerId,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,

        // 전체 주문 수
        orderCount: customer.orders.length,

        // 결제 완료 주문 수
        paidOrderCount: paidOrders.length,

        // 결제 완료 기준 누적 구매 금액
        totalPaidAmount: paidOrders.reduce((sum, order) => sum + order.totalAmount, 0),

        // 가장 최근 주문일
        lastOrderAt: customer.orders[0]?.createdAt ?? null,
      };
    });

    return res.json({
      success: true,
      data: customerList,
    });
  } catch (error) {
    console.error('관리자 고객 목록 조회 실패:', error);

    return res.status(500).json({
      success: false,
      message: '고객 목록 조회 실패',
    });
  }
});

// 관리자 고객 상세 조회 API
router.get('/admin/:id', authAdmin, async (req: Request<{ id: string }>, res: Response) => {
  try {
    // URL에서 고객 id 가져오기
    const customerId = Number(req.params.id);

    // 고객 id 검증
    if (Number.isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 고객 ID입니다.',
      });
    }

    // 고객 기본 정보와 주문 내역 조회
    const customer = await prisma.user.findUnique({
      where: {
        id: customerId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        phoneVerified: true,
        provider: true,
        providerId: true,
        createdAt: true,
        updatedAt: true,

        // 고객 주문 내역
        orders: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
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
        },
      },
    });

    // 고객이 없으면 404 반환
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: '고객을 찾을 수 없습니다.',
      });
    }

    // 예약과 문의는 User relation이 없으므로 전화번호 기준으로 조회
    const customerPhone = customer.phone ?? '';

    // 고객 전화번호가 있을 때만 예약/문의 내역 조회
    const [reservations, contactInquiries] = customerPhone
      ? await Promise.all([
          prisma.reservation.findMany({
            where: {
              phone: customerPhone,
            },
            orderBy: [
              {
                visitDate: 'desc',
              },
              {
                visitTime: 'desc',
              },
            ],
          }),
          prisma.contactInquiry.findMany({
            where: {
              phone: customerPhone,
            },
            orderBy: {
              createdAt: 'desc',
            },
          }),
        ])
      : [[], []];

    // 결제 완료된 주문만 누적 구매 금액에 포함
    const paidOrders = customer.orders.filter((order) => order.status === 'paid');

    return res.json({
      success: true,
      data: {
        ...customer,

        // 고객 요약 정보
        summary: {
          orderCount: customer.orders.length,
          paidOrderCount: paidOrders.length,
          totalPaidAmount: paidOrders.reduce((sum, order) => sum + order.totalAmount, 0),
          reservationCount: reservations.length,
          contactInquiryCount: contactInquiries.length,
        },

        // 전화번호 기준으로 연결한 예약 내역
        reservations,

        // 전화번호 기준으로 연결한 문의 내역
        contactInquiries,
      },
    });
  } catch (error) {
    console.error('관리자 고객 상세 조회 실패:', error);

    return res.status(500).json({
      success: false,
      message: '고객 상세 조회 실패',
    });
  }
});

export default router;
