import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authUser } from '../middlewares/authUser.middleware';

const router = Router();

// 이메일 형식 검증
const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// 휴대폰 번호 형식 검증
// 010-0000-0000 또는 01000000000 형태 허용
const isValidPhone = (phone: string) => {
  return /^010-?\d{4}-?\d{4}$/.test(phone);
};

// 휴대폰 번호 저장 형식 통일
// 010-0000-0000 -> 01000000000
const normalizePhone = (phone: string) => {
  return phone.replace(/-/g, '');
};

// 휴대폰 인증번호 발송 API
router.post('/phone/send-code', async (req: Request, res: Response) => {
  try {
    console.log('[send-code] start');

    const { phone } = req.body;
    console.log('[send-code] phone:', phone);

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 번호를 입력해주세요.',
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: '올바른 휴대폰 번호를 입력해주세요.',
      });
    }

    const normalizedPhone = normalizePhone(phone);
    console.log('[send-code] normalizedPhone:', normalizedPhone);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    console.log('[send-code] before db create');

    await prisma.phoneVerification.create({
      data: {
        phone: normalizedPhone,
        code,
        expiresAt,
      },
    });

    console.log('[send-code] after db create');
    console.log('[send-code] verification code:', code);

    return res.json({
      success: true,
      message: '인증번호가 발송되었습니다.',
      data: {
        code,
      },
    });
  } catch (error) {
    console.error('[send-code] error:', error);

    return res.status(500).json({
      success: false,
      message: '인증번호 발송 실패',
    });
  }
});

// 휴대폰 인증번호 확인 API
router.post('/phone/verify-code', async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;

    // 휴대폰 번호와 인증번호 필수값 검증
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 번호와 인증번호를 입력해주세요.',
      });
    }

    // 휴대폰 번호 형식 검증
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: '올바른 휴대폰 번호를 입력해주세요.',
      });
    }

    // 휴대폰 번호 저장 형식 통일
    const normalizedPhone = normalizePhone(phone);

    // 가장 최근의 유효한 인증번호 조회
    const verification = await prisma.phoneVerification.findFirst({
      where: {
        phone: normalizedPhone,
        code,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 인증번호가 없거나 만료된 경우
    if (!verification) {
      return res.status(400).json({
        success: false,
        message: '인증번호가 올바르지 않거나 만료되었습니다.',
      });
    }

    // 인증 완료 처리
    await prisma.phoneVerification.update({
      where: {
        id: verification.id,
      },
      data: {
        verified: true,
      },
    });

    return res.json({
      success: true,
      message: '휴대폰 인증이 완료되었습니다.',
    });
  } catch (error) {
    console.error('인증번호 확인 실패:', error);

    return res.status(500).json({
      success: false,
      message: '인증번호 확인 실패',
    });
  }
});

// 회원가입 API
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    // 필수 값 검증
    if (!email || !password || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: '필수 정보를 입력해주세요.',
      });
    }

    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '올바른 이메일을 입력해주세요.',
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 8자 이상 입력해주세요.',
      });
    }

    // 휴대폰 번호 형식 검증
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: '올바른 휴대폰 번호를 입력해주세요.',
      });
    }

    // 휴대폰 번호 저장 형식 통일
    const normalizedPhone = normalizePhone(phone);

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

    // 휴대폰 인증 완료 여부 확인
    const phoneVerification = await prisma.phoneVerification.findFirst({
      where: {
        phone: normalizedPhone,
        verified: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!phoneVerification) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 인증을 완료해주세요.',
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
        phone: normalizedPhone,
        phoneVerified: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        phoneVerified: true,
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

    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '올바른 이메일을 입력해주세요.',
      });
    }

    // 회원 조회
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user || !user.password) {
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
      jwtSecret,
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
          phoneVerified: user.phoneVerified,
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
        phoneVerified: true,
        provider: true,
        providerId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '회원 정보를 찾을 수 없습니다.',
      });
    }

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

// 네이버 로그인 시작 API
router.get('/naver', (req: Request, res: Response) => {
  const clientId = process.env.NAVER_CLIENT_ID;
  const callbackUrl = process.env.NAVER_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    return res.status(500).json({
      success: false,
      message: '네이버 로그인 설정이 없습니다.',
    });
  }

  // CSRF 방지용 state 값
  const state = Math.random().toString(36).slice(2);

  const naverAuthUrl = new URL('https://nid.naver.com/oauth2.0/authorize');

  naverAuthUrl.searchParams.set('response_type', 'code');
  naverAuthUrl.searchParams.set('client_id', clientId);
  naverAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  naverAuthUrl.searchParams.set('state', state);

  return res.redirect(naverAuthUrl.toString());
});

// 네이버 로그인 콜백 API
router.get('/naver/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const callbackUrl = process.env.NAVER_CALLBACK_URL;
    const jwtSecret = process.env.JWT_SECRET;
    const clientUrl = process.env.CLIENT_URL;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: '네이버 인증 코드가 없습니다.',
      });
    }

    if (!clientId || !clientSecret || !callbackUrl || !jwtSecret || !clientUrl) {
      return res.status(500).json({
        success: false,
        message: '네이버 로그인 설정이 없습니다.',
      });
    }

    // 네이버 access token 요청
    const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        state: typeof state === 'string' ? state : '',
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(400).json({
        success: false,
        message: '네이버 토큰 발급에 실패했습니다.',
      });
    }

    // 네이버 프로필 조회
    const profileResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok || profileData.resultcode !== '00') {
      return res.status(400).json({
        success: false,
        message: '네이버 프로필 조회에 실패했습니다.',
      });
    }

    const naverProfile = profileData.response;

    const providerId = String(naverProfile.id);
    const email = String(naverProfile.email);
    const name = String(naverProfile.name || naverProfile.nickname || '네이버 회원');
    const phone = naverProfile.mobile ? String(naverProfile.mobile).replace(/-/g, '') : null;

    // 기존 네이버 회원 조회
    let user = await prisma.user.findFirst({
      where: {
        provider: 'naver',
        providerId,
      },
    });

    // 기존 네이버 회원이 없으면 이메일 기준 기존 회원도 확인
    if (!user) {
      user = await prisma.user.findUnique({
        where: {
          email,
        },
      });
    }

    // 회원이 없으면 새로 생성
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          password: null,
          name,
          phone,
          phoneVerified: Boolean(phone),
          provider: 'naver',
          providerId,
        },
      });
    }

    // 기존 이메일 회원이면 네이버 정보 연결
    if (!user.provider || !user.providerId) {
      user = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          provider: 'naver',
          providerId,
          phone: user.phone ?? phone,
          phoneVerified: user.phoneVerified || Boolean(phone),
        },
      });
    }

    // JWT 발급
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      jwtSecret,
      {
        expiresIn: '7d',
      },
    );

    // 프론트로 로그인 결과 전달
    const redirectUrl = new URL(`${clientUrl}/oauth/callback`);
    redirectUrl.searchParams.set('token', token);

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('네이버 로그인 실패:', error);

    return res.status(500).json({
      success: false,
      message: '네이버 로그인 실패',
    });
  }
});

export default router;
