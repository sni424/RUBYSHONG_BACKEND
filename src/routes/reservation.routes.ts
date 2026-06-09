import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

const router = Router();

// 예약 가능한 시간 목록
const RESERVATION_TIMES = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

// 휴무 날짜 목록
const CLOSED_DATES = [
  '2026-06-05',
  //   '2026-09-24',
  //   '2026-09-25',
  //   '2026-09-26',
];

// 날짜 문자열이 YYYY-MM-DD 형식인지 확인
const isValidDateString = (date: string) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
};

// 선택한 날짜가 휴무일인지 확인
const isClosedDate = (date: string) => {
  return CLOSED_DATES.includes(date);
};

// 예약 가능한 시간 조회 API
router.get('/available-times', async (req: Request, res: Response) => {
  try {
    // 쿼리에서 방문 날짜 가져오기
    const date = String(req.query.date ?? '');

    // 날짜 값 검증
    if (!isValidDateString(date)) {
      return res.status(400).json({
        success: false,
        message: '올바른 날짜를 입력해주세요.',
      });
    }

    // 휴무일이면 예약 가능 시간 없음
    if (isClosedDate(date)) {
      return res.json({
        success: true,
        data: {
          date,
          availableTimes: [],
          reservedTimes: [],
        },
      });
    }

    // 해당 날짜에 이미 예약된 시간 조회
    const reservations = await prisma.reservation.findMany({
      where: {
        visitDate: date,
        deletedAt: null,
        status: {
          not: 'cancelled',
        },
      },
      select: {
        visitTime: true,
      },
    });

    // 이미 예약된 시간만 배열로 변환
    const reservedTimes = reservations.map((reservation) => reservation.visitTime);

    // 전체 시간 중 예약되지 않은 시간만 남기기
    const availableTimes = RESERVATION_TIMES.filter((time) => !reservedTimes.includes(time));

    return res.json({
      success: true,
      data: {
        date,
        availableTimes,
        reservedTimes,
      },
    });
  } catch (error) {
    console.error('예약 가능 시간 조회 실패:', error);

    return res.status(500).json({
      success: false,
      message: '예약 가능 시간 조회 실패',
    });
  }
});

// 예약 생성 API
router.post('/', async (req: Request, res: Response) => {
  try {
    // 프론트에서 보낸 예약 정보
    const { name, phone, visitDate, visitTime, message, privacyAgreed } = req.body;

    // 필수 값 검증
    if (!name || !phone || !visitDate || !visitTime) {
      return res.status(400).json({
        success: false,
        message: '필수 예약 정보를 입력해주세요.',
      });
    }

    // 날짜 형식 검증
    if (!isValidDateString(visitDate)) {
      return res.status(400).json({
        success: false,
        message: '올바른 방문 날짜를 입력해주세요.',
      });
    }

    // 예약 시간 검증
    if (!RESERVATION_TIMES.includes(visitTime)) {
      return res.status(400).json({
        success: false,
        message: '올바른 방문 시간을 선택해주세요.',
      });
    }

    // 휴무일 예약 방지
    if (isClosedDate(visitDate)) {
      return res.status(400).json({
        success: false,
        message: '휴무일에는 예약할 수 없습니다.',
      });
    }

    // 개인정보 동의 검증
    if (!privacyAgreed) {
      return res.status(400).json({
        success: false,
        message: '개인정보 수집 및 이용에 동의해주세요.',
      });
    }
    // 삭제되지 않았고 취소되지 않은 예약 중 같은 날짜/시간 예약이 있는지 확인
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        visitDate,
        visitTime,
        deletedAt: null,
        status: {
          not: 'cancelled',
        },
      },
    });

    if (existingReservation) {
      return res.status(409).json({
        success: false,
        message: '이미 예약된 시간입니다.',
      });
    }

    // 예약 생성
    const reservation = await prisma.reservation.create({
      data: {
        name,
        phone,
        visitDate,
        visitTime,
        message,
        privacyAgreed,
      },
    });

    return res.status(201).json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    // 같은 날짜/시간 중복 예약 처리
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: '이미 예약된 시간입니다.',
      });
    }

    console.error('예약 생성 실패:', error);

    return res.status(500).json({
      success: false,
      message: '예약 생성 실패',
    });
  }
});

// 관리자 예약 목록 조회 API
router.get('/admin', async (req: Request, res: Response) => {
  try {
    // includeDeleted=true이면 삭제 처리된 예약까지 조회
    const includeDeleted = req.query.includeDeleted === 'true';
    // 예약 목록 최신순 조회

    // 예약 목록 최신순 조회
    const reservations = await prisma.reservation.findMany({
      where: includeDeleted
        ? {}
        : {
            deletedAt: null,
          },
      orderBy: [
        {
          visitDate: 'desc',
        },
        {
          visitTime: 'desc',
        },
      ],
      include: {
        // 예약 변경 이력도 함께 조회
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

        // 삭제한 관리자 정보도 함께 조회
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
      data: reservations,
    });
  } catch (error) {
    console.error('관리자 예약 목록 조회 실패:', error);

    return res.status(500).json({
      success: false,
      message: '예약 목록 조회 실패',
    });
  }
});

// 관리자 예약 수정 API
// owner, manager, staff 모두 수정 가능
router.patch('/admin/:id', async (req: Request, res: Response) => {
  try {
    const adminUser = req.adminUser;
    const reservationId = Number(req.params.id);
    const { name, phone, visitDate, visitTime, message, status } = req.body;

    // 관리자 로그인 여부 확인
    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.',
      });
    }

    // 예약 ID 검증
    if (!Number.isInteger(reservationId)) {
      return res.status(400).json({
        success: false,
        message: '올바른 예약 ID를 입력해주세요.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 수정 전 예약 데이터 조회
      const before = await tx.reservation.findFirst({
        where: {
          id: reservationId,
          deletedAt: null,
        },
      });

      if (!before) {
        throw new Error('RESERVATION_NOT_FOUND');
      }

      // 예약 정보 수정
      const after = await tx.reservation.update({
        where: {
          id: reservationId,
        },
        data: {
          name,
          phone,
          visitDate,
          visitTime,
          message,
          status,
        },
      });

      // 변경 이력 저장
      await tx.reservationHistory.create({
        data: {
          reservationId,
          action: status && status !== before.status ? 'status_changed' : 'updated',
          changedById: adminUser.id,
          beforeData: JSON.parse(JSON.stringify(before)),
          afterData: JSON.parse(JSON.stringify(after)),
        },
      });

      return after;
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'RESERVATION_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: '예약을 찾을 수 없습니다.',
      });
    }

    console.error('예약 수정 실패:', error);

    return res.status(500).json({
      success: false,
      message: '예약 수정 실패',
    });
  }
});

// 관리자 예약 삭제 API
// owner만 삭제 가능
router.delete('/admin/:id', async (req: Request, res: Response) => {
  try {
    const adminUser = req.adminUser;
    const reservationId = Number(req.params.id);

    // 관리자 로그인 여부 확인
    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.',
      });
    }

    // owner만 삭제 가능
    if (adminUser.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: '예약 삭제는 최고 관리자만 가능합니다.',
      });
    }

    await prisma.$transaction(async (tx) => {
      // 삭제 전 예약 데이터 조회
      const before = await tx.reservation.findFirst({
        where: {
          id: reservationId,
          deletedAt: null,
        },
      });

      if (!before) {
        throw new Error('RESERVATION_NOT_FOUND');
      }

      // 실제 삭제하지 않고 삭제 처리만 함
      const after = await tx.reservation.update({
        where: {
          id: reservationId,
        },
        data: {
          deletedAt: new Date(),
          deletedById: adminUser.id,
        },
      });

      // 삭제 이력 저장
      await tx.reservationHistory.create({
        data: {
          reservationId,
          action: 'deleted',
          changedById: adminUser.id,
          beforeData: JSON.parse(JSON.stringify(before)),
          afterData: JSON.parse(JSON.stringify(after)),
        },
      });
    });

    return res.json({
      success: true,
      message: '예약이 삭제 처리되었습니다.',
    });
  } catch (error) {
    console.error('예약 삭제 실패:', error);

    return res.status(500).json({
      success: false,
      message: '예약 삭제 실패',
    });
  }
});

export default router;
