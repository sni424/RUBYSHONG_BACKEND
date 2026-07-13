import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authUser } from '../middlewares/authUser.middleware';

const router = Router();

// 회원가입 API
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    // 필수 값 검증
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '필수 정보를 입력해주세요.',
      });
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 이메일입니다.',
      });
    }

    // 비밀번호 해시 생성
    const hashedPassword = await bcrypt.hash(password, 10);

    // 회원 생성
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('회원가입 실패:', error);

    return res.status(500).json({
      success: false,
      message: '회원가입 실패',
    });
  }
});

// 로그인 API
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 필수 값 검증
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 입력해주세요.',
      });
    }

    // 회원 조회
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // JWT_SECRET 값 확인
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: 'JWT 설정이 없습니다.',
      });
    }

    // 로그인 토큰 생성
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '7d',
      },
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
      },
    });
  } catch (error) {
    console.error('로그인 실패:', error);

    return res.status(500).json({
      success: false,
      message: '로그인 실패',
    });
  }
});

// 내 정보 조회 API
router.get('/me', authUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // 로그인 정보가 없으면 요청 거절
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.',
      });
    }

    // 회원 정보 조회
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('내 정보 조회 실패:', error);

    return res.status(500).json({
      success: false,
      message: '내 정보 조회 실패',
    });
  }
});

export default router;
