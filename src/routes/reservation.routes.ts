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
    // 예약 목록 최신순 조회
    const reservations = await prisma.reservation.findMany({
      orderBy: [
        {
          visitDate: 'desc',
        },
        {
          visitTime: 'desc',
        },
      ],
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

export default router;
