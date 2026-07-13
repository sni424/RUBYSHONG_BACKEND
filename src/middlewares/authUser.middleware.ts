import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

type UserTokenPayload = {
  userId: number;
  email: string;
};

export const authUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Authorization 헤더 가져오기
    const authorization = req.headers.authorization;

    // JWT_SECRET 값 확인
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: 'JWT 설정이 없습니다.',
      });
    }

    // 토큰이 없으면 요청 거절
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.',
      });
    }

    // Bearer 뒤의 토큰만 추출
    const token = authorization.split(' ')[1];

    // 토큰 문자열이 비어 있으면 요청 거절
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.',
      });
    }

    // 토큰 검증
    const decoded = jwt.verify(token, jwtSecret) as unknown as UserTokenPayload;

    // 토큰 payload 검증
    if (!decoded.userId || !decoded.email) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 로그인 정보입니다.',
      });
    }

    // 토큰에 담긴 회원 조회
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
      },
    });

    // 회원이 없으면 요청 거절
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 로그인 정보입니다.',
      });
    }

    // 이후 라우터에서 사용할 수 있도록 req.user에 저장
    req.user = user;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '로그인이 만료되었습니다. 다시 로그인해주세요.',
    });
  }
};
