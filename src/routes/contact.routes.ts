import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// 문의 생성 API
router.post('/', async (req: Request, res: Response) => {
  try {
    // 프론트에서 보낸 문의 정보
    const { name, phone, title, message } = req.body;

    // 필수값 검증
    if (!name || !phone || !title || !message) {
      return res.status(400).json({
        success: false,
        message: '문의 정보를 모두 입력해주세요.',
      });
    }

    // 문의 생성
    const inquiry = await prisma.contactInquiry.create({
      data: {
        name,
        phone,
        title,
        message,
      },
    });

    return res.status(201).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error('문의 생성 실패:', error);

    return res.status(500).json({
      success: false,
      message: '문의 생성 실패',
    });
  }
});

// 관리자 문의 목록 조회 API
router.get('/admin', async (req: Request, res: Response) => {
  try {
    // 문의 목록 최신순 조회
    const inquiries = await prisma.contactInquiry.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      success: true,
      data: inquiries,
    });
  } catch (error) {
    console.error('문의 목록 조회 실패:', error);

    return res.status(500).json({
      success: false,
      message: '문의 목록 조회 실패',
    });
  }
});

// 관리자 문의 상태 변경 API
router.patch('/admin/:id/status', async (req: Request<{ id: string }>, res: Response) => {
  try {
    // URL에서 문의 id 가져오기
    const inquiryId = Number(req.params.id);

    // 프론트에서 변경할 상태 받기
    const { status } = req.body;

    // 문의 id 검증
    if (Number.isNaN(inquiryId)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 문의 ID입니다.',
      });
    }

    // 문의 상태 검증
    if (!['pending', 'answered', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 문의 상태입니다.',
      });
    }

    // 문의 상태 변경
    const inquiry = await prisma.contactInquiry.update({
      where: {
        id: inquiryId,
      },
      data: {
        status,
      },
    });

    return res.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error('문의 상태 변경 실패:', error);

    return res.status(500).json({
      success: false,
      message: '문의 상태 변경 실패',
    });
  }
});

// 관리자 문의 삭제 API
router.delete('/admin/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    // URL에서 문의 id 가져오기
    const inquiryId = Number(req.params.id);

    // 문의 id 검증
    if (Number.isNaN(inquiryId)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 문의 ID입니다.',
      });
    }

    // 문의 삭제
    await prisma.contactInquiry.delete({
      where: {
        id: inquiryId,
      },
    });

    return res.json({
      success: true,
      message: '문의가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('문의 삭제 실패:', error);

    return res.status(500).json({
      success: false,
      message: '문의 삭제 실패',
    });
  }
});

export default router;
